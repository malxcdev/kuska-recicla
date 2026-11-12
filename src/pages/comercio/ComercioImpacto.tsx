import { useState } from "react";
import { Icon } from "@/components/Icon";
import { ImpactView } from "@/components/ImpactView";
import { PageIntro } from "@/components/ui";
import { requestsForSession } from "@/data/requestActions";
import { formatKg, summarizeImpact } from "@/data/stats";
import { useAuthenticated, useRequestFlow, useRequests, useToast } from "@/state/contexts";

export function ComercioImpacto() {
  const { session, actor } = useAuthenticated();
  const { requests } = useRequests();
  const { openWizard } = useRequestFlow();
  const announce = useToast();
  const [today] = useState(() => new Date());
  const impact = summarizeImpact(requestsForSession(requests, session), today);

  const share = async () => {
    const text = `${actor.name} ya recuperó ${formatKg(impact.totalKg)} de residuos y evitó ${impact.co2Kg} kg de CO₂ con KUSKA Recicla. ¡Reciclemos juntos en Santiago!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Mi impacto en KUSKA", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      announce("Copiamos tu logro. Pégalo donde quieras compartirlo.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      announce("No pudimos compartir tu logro en este dispositivo.");
    }
  };

  return (
    <section className="page-section">
      <PageIntro eyebrow="TU HUELLA POSITIVA" title="Mi impacto" description="Cada kilo recuperado transforma tu comunidad." />
      <ImpactView
        impact={impact}
        label="de residuos recuperados"
        aside={
          <article className="panel achievement">
            <span className="medal"><Icon name="spark" size={32} /></span>
            {impact.count > 0 ? (
              <>
                <p className="eyebrow">NUEVO LOGRO</p>
                <h3>¡Comercio circular!</h3>
                <p>Completaste {impact.count} {impact.count === 1 ? "recojo responsable" : "recojos responsables"} y evitaste que {formatKg(impact.totalKg)} lleguen al botadero.</p>
                <button type="button" onClick={share}><Icon name="share" size={15} /> Compartir mi logro</button>
              </>
            ) : (
              <>
                <p className="eyebrow">PRIMER LOGRO</p>
                <h3>Tu primer recojo</h3>
                <p>Completa tu primer recojo para desbloquear tu insignia de comercio circular.</p>
                <button type="button" onClick={() => openWizard()}>Programar recojo</button>
              </>
            )}
          </article>
        }
      />
    </section>
  );
}
