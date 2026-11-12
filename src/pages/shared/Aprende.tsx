import { useState } from "react";
import { Icon } from "@/components/Icon";
import { LessonDialog } from "@/components/InfoDialogs";
import { PageIntro } from "@/components/ui";
import { LESSONS, type Lesson } from "@/data/catalog";

export function Aprende() {
  const [open, setOpen] = useState<Lesson | null>(null);
  return (
    <section className="page-section">
      <PageIntro eyebrow="APRENDE EN 1 MINUTO" title="Recicla mejor" description="Consejos prácticos para separar tus residuos correctamente." />
      <div className="lesson-grid">
        {LESSONS.map((lesson, index) => (
          <article className="lesson-card" key={lesson.id}>
            <div className={`lesson-art art-${index}`}><Icon name={lesson.icon} size={42} /><span aria-hidden="true">0{index + 1}</span></div>
            <div>
              <p>GUÍA RÁPIDA · 1 MIN</p>
              <h3>{lesson.title}</h3>
              <span>{lesson.summary}</span>
              <button type="button" onClick={() => setOpen(lesson)}>Leer guía <Icon name="chevron" size={15} /></button>
            </div>
          </article>
        ))}
      </div>
      {open && <LessonDialog lesson={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
