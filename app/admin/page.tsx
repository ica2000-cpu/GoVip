import { getAdminData, checkAuth, getAllCommerces, getCurrentCommerceId } from './actions';
import AdminDashboard from '@/components/AdminDashboard';
import AdminLogin from '@/components/AdminLogin';
import { redirect } from 'next/navigation';
import { MASTER_COMMERCE_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const data = await getAdminData();

  if (!data) {
    // Render Login Component (Client Side Wrapper)
    return (
      <AdminLogin 
        onLogin={async (email, password) => {
          'use server'
          const formData = new FormData();
          formData.append('email', email);
          formData.append('password', password);
          const result = await checkAuth(formData);
          if (result.success) {
            redirect('/admin');
          }
        }} 
      />
    );
  }

  // Check if Super Admin to fetch all commerces
  let allCommerces = null;
  
  if (data.isSuperAdmin) {
      const commercesResult = await getAllCommerces();
      if (commercesResult?.success) {
          allCommerces = commercesResult.commerces;
      }
  }

  return (
    <AdminDashboard 
      initialReservations={data.reservations || []} 
      initialStock={data.stock || []} 
      initialEvents={data.events || []}
      initialPaymentSettings={data.paymentSettings}
      commerceName={data.commerceName}
      commerceLogo={data.commerceLogo}
      initialCommerces={allCommerces}
      isSuperAdmin={data.isSuperAdmin}
    />
  );
}
