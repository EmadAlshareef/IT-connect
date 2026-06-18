function RoleBasedMessageModal({ title, subtitle, actions, onClose, onAction }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>

        <div className="space-y-2">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => onAction(action)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-orange-300 hover:bg-orange-50"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default RoleBasedMessageModal
