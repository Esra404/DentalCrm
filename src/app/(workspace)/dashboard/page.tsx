import { Role } from "@/generated/prisma/enums";
import { AdminDashboard, DoctorDashboard, StaffDashboard } from "@/components/dashboard/dashboard-views";
import { requireAuth } from "@/lib/auth/authorization";
import {
  getAdminDashboardData,
  getDoctorDashboardData,
  getStaffDashboardData,
} from "@/lib/dashboard/data";

export default async function DashboardPage() {
  const user = await requireAuth();

  if (user.role === Role.ADMIN) {
    const data = await getAdminDashboardData();
    return <AdminDashboard data={data} name={user.name} />;
  }

  if (user.role === Role.DOCTOR) {
    const data = await getDoctorDashboardData(user.id);
    return <DoctorDashboard data={data} name={user.name} />;
  }

  const data = await getStaffDashboardData();
  return <StaffDashboard data={data} name={user.name} />;
}
