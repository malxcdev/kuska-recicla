import { Dialog } from "./Dialog";
import type { Lesson } from "@/data/catalog";

export function LessonDialog({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  return (
    <Dialog title={lesson.title} eyebrow="GUÍA RÁPIDA · 1 MIN" onClose={onClose}>
      <p className="mt-3 text-sm text-muted">{lesson.summary}</p>
      <ol className="lesson-steps">
        {lesson.steps.map((step, index) => (
          <li key={step}><span>{index + 1}</span>{step}</li>
        ))}
      </ol>
      <button type="button" className="primary-button full" onClick={onClose}>Entendido</button>
    </Dialog>
  );
}

export function TermsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Términos y privacidad" eyebrow="KUSKA RECICLA" onClose={onClose}>
      <div className="mt-4 grid gap-3 text-sm text-ink">
        <p><strong>Uso del servicio.</strong> KUSKA conecta a comercios, recicladores, empresas valorizadoras y la municipalidad de Santiago para programar y registrar recojos de residuos aprovechables.</p>
        <p><strong>Tus datos.</strong> Usamos tu nombre, celular, correo y dirección solo para coordinar recojos y medir el impacto de la red. Tu celular y dirección los ve únicamente el reciclador asignado a tu pedido.</p>
        <p><strong>Tus derechos.</strong> Puedes pedir que actualicemos o eliminemos tus datos cuando quieras, conforme a la Ley N.º 29733 de Protección de Datos Personales.</p>
        <p className="text-muted">Versión de demostración: el texto legal definitivo se publicará antes del lanzamiento.</p>
      </div>
      <button type="button" className="primary-button full mt-5" onClick={onClose}>Cerrar</button>
    </Dialog>
  );
}
