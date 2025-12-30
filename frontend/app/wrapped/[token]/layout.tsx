import LocaleProvider from '@/components/LocaleProvider';

type Props = {
  children: React.ReactNode;
};

export default function WrappedLayout({ children }: Props) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
