import Link from "next/link";
import { signOut } from "@/auth";
import { requireMember } from "@/lib/access";
export default async function DashboardLayout({children}:{children:React.ReactNode}){
 const {membership}=await requireMember();
 return <div className="shell"><aside className="side"><div className="brand">Recy<span>Track</span></div><p style={{fontSize:12,color:"#b9d4d7"}}>{membership.organization.name}</p><nav className="nav"><Link href="/dashboard">Overview</Link><Link href="/dashboard/customers">Customers</Link><Link href="/dashboard/collections">Collections</Link><Link href="/dashboard/routes">Route calendar</Link></nav><form action={async()=>{"use server";await signOut({redirectTo:"/login"})}}><button className="btn secondary" style={{marginTop:32}}>Sign out</button></form></aside><main className="main">{children}</main></div>
}
