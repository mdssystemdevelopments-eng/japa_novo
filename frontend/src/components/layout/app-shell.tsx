'use client';

import { useAuth } from '@/contexts/auth-context';
import {
  Building2,
  Car,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  CalendarDays,
  Wallet,
  FileText,
  Package,
  Truck,
  UserRound,
  Users,
  Warehouse,
  Scissors,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;
  roles?: string[];
};

const NAV: NavItem[] = [
  {
    href: '/',
    label: 'Painel',
    icon: <LayoutDashboard className="h-4 w-4" />,
    permission: 'dashboard.read',
  },
  {
    href: '/clientes',
    label: 'Clientes',
    icon: <UserRound className="h-4 w-4" />,
    permission: 'customers.read',
  },
  {
    href: '/veiculos',
    label: 'Veículos',
    icon: <Car className="h-4 w-4" />,
    permission: 'vehicles.read',
  },
  {
    href: '/produtos',
    label: 'Produtos',
    icon: <Package className="h-4 w-4" />,
    permission: 'products.read',
  },
  {
    href: '/estoque',
    label: 'Estoque',
    icon: <Warehouse className="h-4 w-4" />,
    permission: 'stock.read',
  },
  {
    href: '/fornecedores',
    label: 'Fornecedores',
    icon: <Truck className="h-4 w-4" />,
    permission: 'suppliers.read',
  },
  {
    href: '/entrada-mercadorias',
    label: 'Entrada de mercadorias',
    icon: <FileText className="h-4 w-4" />,
    permission: 'goods_receipt.read',
  },
  {
    href: '/orcamentos',
    label: 'Orçamentos',
    icon: <FileText className="h-4 w-4" />,
    permission: 'quotes.read',
  },
  {
    href: '/agendamentos',
    label: 'Agendamentos',
    icon: <CalendarDays className="h-4 w-4" />,
    permission: 'appointments.read',
  },
  {
    href: '/ordens-servico',
    label: 'Ordens de serviço',
    icon: <ClipboardList className="h-4 w-4" />,
    permission: 'work_orders.read',
  },
  {
    href: '/financeiro',
    label: 'Financeiro',
    icon: <Wallet className="h-4 w-4" />,
    permission: 'finance.read',
  },
  {
    href: '/corte-automotivo',
    label: 'Corte automotivo',
    icon: <Scissors className="h-4 w-4" />,
    permission: 'cut.read',
  },
  {
    href: '/configuracoes',
    label: 'Configurações da empresa',
    icon: <Building2 className="h-4 w-4" />,
    permission: 'company.read',
  },
  {
    href: '/usuarios',
    label: 'Usuários',
    icon: <Users className="h-4 w-4" />,
    permission: 'users.read',
  },
  {
    href: '/auditoria',
    label: 'Auditoria',
    icon: <ClipboardList className="h-4 w-4" />,
    permission: 'audit.read',
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, hasPermission, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Carregando sessão...
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  const items = NAV.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Japa Insufilm
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {user.company.tradeName}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="font-medium">{user.fullName}</p>
              <p className="text-slate-500">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => logout().then(() => router.push('/login'))}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="space-y-1 rounded-lg border border-slate-200 bg-white p-2">
            {items.map((item) => {
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
