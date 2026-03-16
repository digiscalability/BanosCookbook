import { ProtectedPage } from '@/components/auth/protected-page';
import { BrandsAdmin } from './brands-admin';

export default function AdminBrandsPage() {
  return (
    <ProtectedPage>
      <BrandsAdmin />
    </ProtectedPage>
  );
}
