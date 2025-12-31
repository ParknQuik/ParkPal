/**
 * Type declarations for JSX module imports
 * This allows TypeScript to import .jsx files without type errors
 */

declare module '*.jsx' {
  import { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

// Specific declarations for screen components
declare module './screens/MapView.jsx' {
  import { ComponentType } from 'react';
  const MapView: ComponentType<any>;
  export default MapView;
}

declare module './screens/Reservation.jsx' {
  import { ComponentType } from 'react';
  const Reservation: ComponentType<any>;
  export default Reservation;
}

declare module './screens/Payment.jsx' {
  import { ComponentType } from 'react';
  const Payment: ComponentType<any>;
  export default Payment;
}

declare module './screens/ListSlot.jsx' {
  import { ComponentType } from 'react';
  const ListSlot: ComponentType<any>;
  export default ListSlot;
}

declare module './screens/HostDashboard.jsx' {
  import { ComponentType } from 'react';
  const HostDashboard: ComponentType<any>;
  export default HostDashboard;
}

declare module './screens/AdminDashboard.jsx' {
  import { ComponentType } from 'react';
  const AdminDashboard: ComponentType<any>;
  export default AdminDashboard;
}

declare module '../Payment' {
  import { ComponentType } from 'react';
  const Payment: ComponentType<any>;
  export default Payment;
}

declare module '../../screens/Payment' {
  import { ComponentType } from 'react';
  const Payment: ComponentType<any>;
  export default Payment;
}

declare module '../Payment.jsx' {
  import { ComponentType } from 'react';
  const Payment: ComponentType<any>;
  export default Payment;
}

declare module '../../screens/Payment.jsx' {
  import { ComponentType } from 'react';
  const Payment: ComponentType<any>;
  export default Payment;
}
