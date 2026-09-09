import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-soporte',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Centro de ayuda y soporte</h1>
        <p>Encuentra respuestas, recursos y contacta con el equipo de soporte de MESOFTX.</p>
      </div>

      <!-- Canales de contacto -->
      <div class="section-label">¿NECESITAS AYUDA INMEDIATA?</div>
      <div class="contact-grid">
        <div class="contact-card" *ngFor="let c of channels">
          <div class="contact-icon" [class]="c.color"><i [class]="'pi ' + c.icon"></i></div>
          <div class="contact-title">{{ c.title }}</div>
          <div class="contact-value" [class]="c.valueColor">{{ c.value }}</div>
          <div class="contact-hint">{{ c.hint }}</div>
        </div>
      </div>

      <!-- Recursos -->
      <div class="section-label">CENTRO DE RECURSOS</div>
      <div class="resources-grid">
        <div class="resource-card" *ngFor="let r of resources">
          <div class="resource-icon" [class]="r.color"><i [class]="'pi ' + r.icon"></i></div>
          <div>
            <div class="resource-title">{{ r.title }}</div>
            <div class="resource-desc">{{ r.desc }}</div>
          </div>
        </div>
      </div>

      <!-- FAQ -->
      <div class="section-label">PREGUNTAS FRECUENTES</div>
      <div class="faq-list">
        <div class="faq-item" *ngFor="let faq of faqs" (click)="faq.open = !faq.open">
          <div class="faq-q">
            <span>{{ faq.q }}</span>
            <i class="pi" [class]="faq.open ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
          </div>
          <div class="faq-a" *ngIf="faq.open">{{ faq.a }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .section-label {
      font-size: 10px; font-weight: 700; color: var(--text-muted);
      letter-spacing: 0.08em; margin: 24px 0 12px;
    }
    .contact-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
    }
    .contact-card {
      background: #fff; border: 1px solid var(--border);
      border-radius: var(--radius-md); padding: 24px;
    }
    .contact-icon {
      width: 44px; height: 44px; border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; margin-bottom: 12px;
    }
    .contact-icon.orange { background: rgba(255,165,2,0.1);  color: var(--primary); }
    .contact-icon.purple { background: rgba(124,58,237,0.1); color: var(--accent); }
    .contact-icon.green  { background: rgba(22,163,74,0.1);  color: var(--badge-open); }
    .contact-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .contact-value { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
    .contact-value.orange { color: var(--primary); }
    .contact-value.purple { color: var(--accent); }
    .contact-value.green  { color: var(--badge-open); }
    .contact-hint  { font-size: 12px; color: var(--text-muted); }

    .resources-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
    }
    .resource-card {
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md);
      padding: 16px 20px; display: flex; align-items: center; gap: 14px;
      cursor: pointer; transition: border-color 0.15s;
    }
    .resource-card:hover { border-color: var(--primary); }
    .resource-icon {
      width: 40px; height: 40px; border-radius: var(--radius-sm); flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 18px;
    }
    .resource-icon.orange { background: rgba(255,165,2,0.1);  color: var(--primary); }
    .resource-icon.purple { background: rgba(124,58,237,0.1); color: var(--accent); }
    .resource-icon.green  { background: rgba(22,163,74,0.1);  color: var(--badge-open); }
    .resource-icon.blue   { background: rgba(3,105,161,0.1);  color: #0369A1; }
    .resource-title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
    .resource-desc  { font-size: 12px; color: var(--text-muted); }

    .faq-list { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; }
    .faq-item { border-bottom: 1px solid var(--border); cursor: pointer; }
    .faq-item:last-child { border-bottom: none; }
    .faq-q {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; font-size: 14px; font-weight: 600; color: var(--text);
    }
    .faq-q i { color: var(--text-muted); font-size: 12px; flex-shrink: 0; }
    .faq-a { padding: 0 20px 16px; font-size: 13px; color: var(--text-muted); line-height: 1.7; }
  `]
})
export class SoporteComponent {
  channels = [
    { title:'Correo electrónico', value:'soporte.mesoftx@unab.edu.co', hint:'Respuesta en 24-48 horas',              icon:'pi-envelope', color:'orange', valueColor:'orange' },
    { title:'Teléfono',           value:'+57 (7) 643 6111 ext. 1234',  hint:'Lun a vie, 8:00 a.m. – 5:00 p.m.',    icon:'pi-phone',    color:'purple', valueColor:'purple' },
    { title:'Chat en vivo',       value:'Disponible ahora',            hint:'Asistencia inmediata',                  icon:'pi-comments', color:'green',  valueColor:'green'  },
  ];
  resources = [
    { title:'Manual de usuario MESOFTX', desc:'Guía completa para usar la plataforma',    icon:'pi-file',       color:'orange' },
    { title:'Tutoriales en vídeo',        desc:'Serie de vídeos explicativos paso a paso', icon:'pi-video',      color:'purple' },
    { title:'Documentación ABET',         desc:'Criterios y estándares de acreditación',   icon:'pi-book',       color:'green'  },
    { title:'Preguntas frecuentes',       desc:'Base de conocimientos extendida',           icon:'pi-question-circle', color:'blue' },
  ];
  faqs = [
    { q:'¿Cómo registro una valoración ABET?',
      a:'Dirígete a "Registrar valoración", selecciona el Student Outcome para cargar su rúbrica, y elige el nivel de logro de cada estudiante por identificador de desempeño.', open:false },
    { q:'¿Qué significa cada nivel de logro?',
      a:'La rúbrica usa 4 niveles: Insatisfactorio, En desarrollo, Bueno y Supera las expectativas. Cada uno tiene un descriptor específico por identificador (ID).', open:false },
    { q:'¿Puedo guardar una valoración a medias?',
      a:'Sí. Usa "Guardar borrador" para conservar tu avance y continuar más tarde antes del cierre del período.', open:false },
  ];
}
