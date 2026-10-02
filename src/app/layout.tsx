import './globals.css';

export const metadata = {
  title: 'Cúpula Esports',
  description: 'Plataforma oficial de gestão de torneios e equipas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    
      
        {children}
      
    
  );
}