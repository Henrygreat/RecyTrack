import {PrismaClient} from "@prisma/client";
import {hash} from "bcryptjs";
const prisma=new PrismaClient();
async function main(){
 const email=process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();const password=process.env.SEED_ADMIN_PASSWORD;
 if(!email||!password||password.length<12)throw new Error("Set SEED_ADMIN_EMAIL and a unique SEED_ADMIN_PASSWORD of at least 12 characters");
 const slug="demo-recycling";
 const org=await prisma.organization.upsert({where:{slug},update:{},create:{slug,name:process.env.SEED_ORG_NAME||"Demo Recycling Ltd"}});
 const user=await prisma.user.upsert({where:{email},update:{},create:{email,name:"Platform Administrator",passwordHash:await hash(password,12)}});
 await prisma.membership.upsert({where:{userId_organizationId:{userId:user.id,organizationId:org.id}},update:{role:"OWNER"},create:{userId:user.id,organizationId:org.id,role:"OWNER"}});
 const zones=[{name:"Telford & Shrewsbury",prefixes:["TF","SY"]},{name:"Birmingham & Wolverhampton",prefixes:["B","WV"]}];
 for(const zone of zones){let z=await prisma.collectionZone.findFirst({where:{organizationId:org.id,name:zone.name}});if(!z)z=await prisma.collectionZone.create({data:{organizationId:org.id,name:zone.name,postcodePrefixes:zone.prefixes}});for(let i=1;i<=4;i++){const d=new Date();d.setUTCDate(d.getUTCDate()+i*7);d.setUTCHours(12,0,0,0);await prisma.routeDate.upsert({where:{zoneId_serviceDate:{zoneId:z.id,serviceDate:d}},update:{},create:{organizationId:org.id,zoneId:z.id,serviceDate:d,capacity:8}})}}
 console.log(`Seed complete. Login: ${email}. Change the password before production use.`);
}
main().finally(()=>prisma.$disconnect());
