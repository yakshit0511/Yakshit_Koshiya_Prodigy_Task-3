import AdminSidebar from './AdminSidebar';

export default function AdminLayoutWrapper({ children, title }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', color: 'var(--color-text)' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', boxSizing: 'border-box' }}>
        {title && (
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 16, marginBottom: 24 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{title}</h1>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
