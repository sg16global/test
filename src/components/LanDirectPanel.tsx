"use client";

import { useState } from "react";
import { QrBox } from "./QrBox";
import { Badge, Btn, Card } from "./ui";

type Props = {
  mode: "send" | "receive";
  disabled?: boolean;
  initialOffer?: string;
  onCreateOffer: () => Promise<string>;
  onAcceptOffer: (token: string) => Promise<string>;
  onCompletePairing: (token: string) => Promise<void>;
};

export function LanDirectPanel({
  mode,
  disabled,
  initialOffer = "",
  onCreateOffer,
  onAcceptOffer,
  onCompletePairing,
}: Props) {
  const [open, setOpen] = useState(Boolean(initialOffer));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [offerToken, setOfferToken] = useState("");
  const [answerToken, setAnswerToken] = useState("");
  const [pasteOffer, setPasteOffer] = useState(initialOffer);
  const [pasteAnswer, setPasteAnswer] = useState("");

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pairing failed");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="glass-deep-subtle w-full rounded-lg px-2.5 py-2 text-left text-[11px] text-orange-100 transition hover:brightness-110 disabled:opacity-50"
      >
        <span className="font-semibold">📶 Offline LAN Direct</span>
        <span className="mt-1 block text-[11px] text-slate-400">
          No server needed — pair over hotspot or local Wi-Fi when you have no internet.
        </span>
      </button>
    );
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="orange">offline</Badge>
            <p className="text-sm font-semibold text-white">LAN Direct pairing</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            {mode === "send"
              ? "Create an offer, let the receiver scan it, then paste their reply code."
              : "Paste or scan the sender's offer, then send the reply code back."}
          </p>
        </div>
        <Btn tone="ghost" size="sm" onClick={() => setOpen(false)}>
          close
        </Btn>
      </div>

      {mode === "send" ? (
        <div className="space-y-3">
          {!offerToken ? (
            <Btn
              size="sm"
              disabled={busy || disabled}
              onClick={() =>
                run(async () => {
                  const token = await onCreateOffer();
                  setOfferToken(token);
                })
              }
            >
              create offline offer
            </Btn>
          ) : (
            <>
              <QrBox value={offerToken} caption="Receiver scans this on the other device." compact />
              <textarea
                readOnly
                value={offerToken}
                rows={3}
                className="glass-input w-full rounded-xl p-3 font-mono text-[10px] text-orange-100/90"
              />
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">Paste the receiver&apos;s reply code:</p>
                <textarea
                  value={pasteAnswer}
                  onChange={(event) => setPasteAnswer(event.target.value)}
                  rows={3}
                  placeholder="SG16…"
                  className="glass-input w-full rounded-xl p-3 font-mono text-[10px] text-white outline-none focus:border-orange-400/60 focus:shadow-[0_0_16px_-4px_rgba(255,120,0,0.5)]"
                />
                <Btn
                  size="sm"
                  disabled={busy || !pasteAnswer.trim()}
                  onClick={() =>
                    run(async () => {
                      await onCompletePairing(pasteAnswer.trim());
                    })
                  }
                >
                  complete pairing
                </Btn>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {!answerToken ? (
            <>
              <textarea
                value={pasteOffer}
                onChange={(event) => setPasteOffer(event.target.value)}
                rows={4}
                placeholder="Paste sender offer (SG16…)"
                className="glass-input w-full rounded-xl p-3 font-mono text-[10px] text-white outline-none focus:border-orange-400/60"
              />
              <Btn
                size="sm"
                disabled={busy || !pasteOffer.trim() || disabled}
                onClick={() =>
                  run(async () => {
                    const token = await onAcceptOffer(pasteOffer.trim());
                    setAnswerToken(token);
                  })
                }
              >
                accept offer
              </Btn>
            </>
          ) : (
            <>
              <p className="text-[11px] text-emerald-300">Send this reply back to the sender:</p>
              <QrBox value={answerToken} caption="Sender scans or copies this reply." compact />
              <textarea
                readOnly
                value={answerToken}
                rows={3}
                className="glass-input w-full rounded-xl p-3 font-mono text-[10px] text-orange-100/90"
              />
            </>
          )}
        </div>
      )}

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </Card>
  );
}
