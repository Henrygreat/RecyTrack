import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerForm } from "../components/customer-form";

export default async function NewCustomer() {
  await requireMember(undefined, MANAGEMENT_ROLES);

  return (
    <>
      <PageHeader
        title="Add Customer"
        description="Create a new customer account"
      />

      <Card>
        <CardContent style={{ padding: "1.5rem" }}>
          <CustomerForm />
        </CardContent>
      </Card>
    </>
  );
}
