import { ProtectedPage } from '@/components/auth/protected-page';
import { StoreManager } from './store-manager';

export default function StorePage() {
  return (
    <ProtectedPage>
      <StoreManager />
    </ProtectedPage>
  );
}
