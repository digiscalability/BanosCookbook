export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-card mt-auto">
      <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
        <p>&copy; {currentYear} Family Cookbook Hub. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
