export default function CarregandoAba() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="h-24 animate-pulse bg-sutil" />
      <div className="h-48 animate-pulse bg-sutil" />
    </div>
  );
}
