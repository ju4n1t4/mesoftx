import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-soporte',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './soporte.component.html',
  styleUrl: './soporte.component.scss'
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
