import { useCallback, useEffect, useState } from "react";
import { walletApi } from "@/src/api";
import { WalletBalanceState } from "@/src/types";

/**
 * The customer's PORTAL balance, with the mandated three states:
 *   loading      -> show a skeleton/placeholder
 *   ok           -> the real portal balance (may legitimately be 0.00)
 *   unavailable  -> "Balance temporarily unavailable" — NEVER $0.00, NEVER
 *                   a legacy pkg_wallet value.
 *
 * Any failure (network, portal down, unmapped, auth) resolves to `unavailable`.
 * It never resolves to a fabricated number.
 */
export function useBalance(): { state: WalletBalanceState; reload: () => void } {
  const [state, setState] = useState<WalletBalanceState>({ status: "loading" });

  const reload = useCallback(() => {
    let alive = true;
    setState({ status: "loading" });
    walletApi
      .balance()
      .then((s) => { if (alive) setState(s); })
      .catch(() => { if (alive) setState({ status: "unavailable" }); });
    return () => { alive = false; };
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { state, reload };
}
