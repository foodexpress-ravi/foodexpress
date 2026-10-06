export default function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium">
          Try again
        </button>
      )}
    </div>
  );
}
