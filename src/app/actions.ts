"use server";
import { prisma } from "@/lib/prisma";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { collectionSchema, customerSchema, statusSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import type { CollectionStatus } from "@prisma/client";

function value(form: FormData, key: string) { return String(form.get(key) ?? ""); }
function parseDate(input:string) { const d=new Date(`${input}T12:00:00.000Z`); if(!/^\d{4}-\d{2}-\d{2}$/.test(input)||Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==input) throw new Error("Invalid date"); return d; }

async function generateCustomerReference(organizationId: string): Promise<string> {
  const lastCustomer = await prisma.customer.findFirst({
    where: { organizationId },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });
  if (!lastCustomer?.reference) return "CUST-0001";
  const match = lastCustomer.reference.match(/CUST-(\d+)/);
  if (!match) return "CUST-0001";
  const nextNum = parseInt(match[1], 10) + 1;
  return `CUST-${nextNum.toString().padStart(4, "0")}`;
}

export async function createCustomer(form:FormData) {
  const { organizationId, userId } = await requireMember(undefined,MANAGEMENT_ROLES);
  const parsed=customerSchema.parse(Object.fromEntries(form));
  const reference = await generateCustomerReference(organizationId);
  await prisma.$transaction(async tx=>{
    const c=await tx.customer.create({data:{...parsed,reference,organizationId}});
    await tx.auditLog.create({data:{organizationId,actorUserId:userId,action:"CUSTOMER_CREATED",entityType:"Customer",entityId:c.id}});
  });
  revalidatePath("/dashboard/customers"); redirect("/dashboard/customers");
}

export async function createCollection(form:FormData) {
  const { organizationId,userId } = await requireMember(undefined,MANAGEMENT_ROLES);
  const parsed=collectionSchema.parse(Object.fromEntries(form));
  const customer=await prisma.customer.findFirst({where:{id:parsed.customerId,organizationId}});
  if(!customer) throw new Error("Customer not found in your organisation");
  const reference=`COL-${randomUUID().slice(0,8).toUpperCase()}`;
  await prisma.$transaction(async tx=>{
    let routeDateId:string|null=null;
    if(parsed.routeDateId){
      const route=await tx.routeDate.findFirst({where:{id:parsed.routeDateId,organizationId,isOpen:true,serviceDate:{gte:new Date(new Date().toISOString().slice(0,10)+"T00:00:00.000Z")}},include:{_count:{select:{collections:{where:{status:{not:"CANCELLED"}}}}}}});
      if(!route||route._count.collections>=route.capacity) throw new Error("Route unavailable or full");
      routeDateId=route.id;
    }
    const collection=await tx.collection.create({data:{organizationId,reference,customerId:parsed.customerId,address:parsed.address,postcode:parsed.postcode.toUpperCase(),itemEstimate:parsed.itemEstimate,notes:parsed.notes||null,routeDateId,bookingMode:routeDateId?"SCHEDULED":"ALTERNATIVE",requestedDate:routeDateId?null:parseDate(parsed.requestedDate!)}});
    await tx.auditLog.create({data:{organizationId,actorUserId:userId,action:"COLLECTION_CREATED",entityType:"Collection",entityId:collection.id}});
  },{isolationLevel:"Serializable"});
  revalidatePath("/dashboard/collections");redirect("/dashboard/collections");
}

const transitions:Record<CollectionStatus,CollectionStatus[]>={REQUESTED:["CONFIRMED","CANCELLED"],CONFIRMED:["ASSIGNED","CANCELLED"],ASSIGNED:["IN_TRANSIT","CANCELLED"],IN_TRANSIT:["COLLECTED","CANCELLED"],COLLECTED:["RECEIVED"],RECEIVED:[],CANCELLED:[]};

export async function updateCollectionStatus(form:FormData){
  const {organizationId,userId}=await requireMember(undefined,MANAGEMENT_ROLES);
  const id=value(form,"id"),status=statusSchema.parse(value(form,"status"));
  await prisma.$transaction(async tx=>{
    const existing=await tx.collection.findFirst({where:{id,organizationId}});
    if(!existing) throw new Error("Collection not found");
    if(!transitions[existing.status].includes(status)) throw new Error("Invalid status transition");
    await tx.collection.update({where:{id},data:{status,collectedAt:status==="COLLECTED"?new Date():undefined,receivedAt:status==="RECEIVED"?new Date():undefined}});
    await tx.auditLog.create({data:{organizationId,actorUserId:userId,action:"COLLECTION_STATUS_UPDATED",entityType:"Collection",entityId:id,details:{from:existing.status,to:status}}});
  });
  revalidatePath("/dashboard/collections");
}
