/** True when catalog data was loaded from the API (SQL Server), not static seed only. */
export function catalogBranchMapHasApiRows(byBranch) {
  return Object.values(byBranch ?? {}).some((list) => Array.isArray(list) && list.length > 0)
}
