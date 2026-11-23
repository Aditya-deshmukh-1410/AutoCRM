type Employee = { userId: number; name: string; email: string; role: string };

type Props = {
  assignedUserId: number | null;
  users: Employee[];
  saving?: boolean;
  onAssign: (userId: number | null) => void;
};

export default function AssignmentControl({ assignedUserId, users, saving = false, onAssign }: Props) {
  return (
    <label className="flex min-w-40 items-center gap-2 text-xs text-muted-foreground">
      <span className="sr-only">Assigned employee</span>
      <select aria-label="Assigned employee" disabled={saving} value={assignedUserId ?? ""}
        onChange={(event) => onAssign(event.target.value ? Number(event.target.value) : null)}
        className="h-9 w-full rounded-md border border-brand-600/20 bg-white px-2 text-xs text-ink">
        <option value="">Unassigned</option>
        {users.filter((user) => user.role.toUpperCase() === "SALES").map((user) =>
          <option key={user.userId} value={user.userId}>{user.name}</option>)}
      </select>
    </label>
  );
}
