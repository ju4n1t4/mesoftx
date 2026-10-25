import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LEGAL } from './legal.config';
import { LegalFooterComponent } from '../../../../../shared/ui/molecules/legal-footer/legal-footer.component';

interface Section { title: string; paragraphs?: string[]; items?: string[]; }
interface LegalDoc { title: string; intro: string; sections: Section[]; }

const L = LEGAL;
const contacto = L.correoDatos;

const PRIVACIDAD: LegalDoc = {
  title: 'Política de tratamiento de datos personales',
  intro: `Esta política explica qué datos personales trata ${L.sistema}, para qué, cómo los protegemos y cómo puede ejercer sus derechos. Se expide en cumplimiento del artículo 15 de la Constitución Política, la Ley Estatutaria 1581 de 2012 y sus decretos reglamentarios (compilados en el Decreto 1074 de 2015).`,
  sections: [
    { title: '1. Responsable del tratamiento', paragraphs: [
      `${L.responsable}${L.nit ? ', NIT ' + L.nit : ''}, a través de la ${L.dependencia}.`,
      `Canal para consultas, reclamos y ejercicio de derechos: ${contacto}.` + (L.direccion ? ` Dirección: ${L.direccion}.` : '') + (L.telefono ? ` Teléfono: ${L.telefono}.` : ''),
      ...(L.politicaInstitucionalUrl ? [`Esta política complementa la Política institucional de Tratamiento de Datos Personales de la UNAB: ${L.politicaInstitucionalUrl}.`] : ['Esta política complementa la Política institucional de Tratamiento de Datos Personales de la UNAB.']),
    ]},
    { title: '2. Datos que se tratan y de quién', items: [
      'Usuarios de la plataforma (profesores, coordinadores, auditores y administradores): número de documento, nombre, correo institucional, perfil, programa y cursos (NRC) asignados, y registros de acceso y de actividad (fecha, usuario, acción, dirección IP).',
      'Estudiantes: número de documento, nombre, programa, cursos (NRC) en los que están matriculados y el nivel de logro asignado por los profesores en cada indicador de los Student Outcomes. Estos datos los cargan el profesor responsable del curso o la coordinación.',
      'Visitantes de la vista pública: no se les solicita ni se almacena ningún dato personal. Su dirección IP se usa solo de forma transitoria para limitar solicitudes abusivas.',
      'No se recolectan datos sensibles (salud, origen racial o étnico, orientación política, religiosa o sexual, datos biométricos, entre otros) ni se pretende tratar datos de niños, niñas y adolescentes. Quienes carguen listados deben limitarse a los campos solicitados. Si algún titular fuera menor de edad, se respetará el interés superior del menor (art. 7, Ley 1581).',
    ]},
    { title: '3. Finalidades', items: [
      'Autenticar a los usuarios y controlar el acceso según su perfil.',
      'Registrar y consultar la valoración de los resultados de aprendizaje (Student Outcomes) de los estudiantes para el proceso de acreditación y el mejoramiento continuo de los programas de la Facultad de Ingeniería.',
      'Calcular indicadores de desempeño agregados por programa, Student Outcome y periodo académico.',
      'Dejar trazabilidad y auditoría del proceso (quién valoró y cuándo).',
      'Garantizar la seguridad de la información y prevenir accesos no autorizados.',
      'Atender requerimientos de autoridades competentes y obligaciones legales.',
    ], paragraphs: ['Los datos no se usan con fines comerciales ni publicitarios y no se venden ni se ceden a terceros.']},
    { title: '4. Autorización', paragraphs: [
      'Los usuarios de la plataforma autorizan este tratamiento de forma previa, expresa e informada al activar su cuenta y al iniciar sesión, momento en que se les informa esta política.',
      'El tratamiento de los datos de los estudiantes se realiza en el marco de su relación académica con la UNAB y de la Política institucional de Tratamiento de Datos Personales de la UNAB, con la finalidad descrita en el numeral 3.',
    ]},
    { title: '5. Vista pública', paragraphs: [
      `La vista pública solo muestra resultados agregados por Student Outcome. Nunca muestra nombres, documentos, cursos ni profesores. Cuando el grupo valorado es menor a 5 estudiantes, el resultado no se publica para evitar identificar a las personas.`,
    ]},
    { title: '6. Encargados, transmisiones y transferencias', paragraphs: [
      'La plataforma se aloja en la infraestructura que defina la UNAB. Los datos podrán compartirse con las entidades acreditadoras únicamente de forma agregada o anonimizada, o cuando una autoridad competente lo exija.',
      'Si el alojamiento implicara transmitir o transferir datos a servidores fuera de Colombia, se hará cumpliendo el artículo 26 de la Ley 1581 y las instrucciones de la Superintendencia de Industria y Comercio (SIC).',
    ]},
    { title: '7. Medidas de seguridad', items: [
      'Contraseñas almacenadas únicamente cifradas (hash); nunca en texto plano.',
      'Sesiones con token de expiración corta y control de acceso por perfil y permisos en cada servicio.',
      'Límite de intentos fallidos de inicio de sesión y bitácora de auditoría de accesos y cambios, sin registrar contraseñas ni contenido de los datos.',
      'Comunicaciones cifradas (HTTPS) en el despliegue de producción.',
      'Los usuarios deben mantener la confidencialidad de sus credenciales y de la información de los estudiantes a la que accedan.',
    ]},
    { title: '8. Conservación', paragraphs: [
      'Los datos se conservan mientras sean necesarios para la finalidad descrita, durante el ciclo de acreditación y los plazos de retención documental definidos por la UNAB. Vencidos estos, se suprimen o se anonimizan.',
    ]},
    { title: '9. Derechos de los titulares', items: [
      'Conocer, actualizar y rectificar sus datos personales.',
      'Solicitar prueba de la autorización otorgada, salvo cuando la ley exceptúe este requisito.',
      'Ser informado, previa solicitud, del uso que se ha dado a sus datos.',
      'Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley, una vez agotado el trámite de consulta o reclamo ante el responsable.',
      'Revocar la autorización y/o solicitar la supresión de sus datos cuando no se respeten los principios, derechos y garantías legales, o cuando no exista un deber legal o contractual de conservarlos.',
      'Acceder de forma gratuita a sus datos personales.',
    ]},
    { title: '10. Cómo ejercer sus derechos', paragraphs: [
      `Envíe su solicitud a ${contacto} indicando su nombre, número de documento, la descripción clara de lo que solicita y un medio para responderle. Anexe los documentos que quiera hacer valer.`,
      'Consultas: se responden en máximo diez (10) días hábiles contados desde su recibo; si no es posible, se informará el motivo y la nueva fecha, que no superará cinco (5) días hábiles adicionales.',
      'Reclamos (corrección, actualización, supresión o revocatoria): se responden en máximo quince (15) días hábiles; si no es posible, se informará el motivo y la nueva fecha, que no superará ocho (8) días hábiles adicionales. Si la solicitud está incompleta, se le pedirá subsanarla dentro de los cinco (5) días siguientes a su recibo.',
      'Los usuarios de la plataforma pueden además cambiar su propia contraseña desde la opción “Mi cuenta”.',
    ]},
    { title: '11. Almacenamiento en el navegador y cookies', paragraphs: [
      `${L.sistema} no usa cookies de seguimiento, analítica ni publicidad, y no carga recursos de terceros (la tipografía se sirve desde el propio sitio). Al iniciar sesión guarda en el almacenamiento local de su navegador el token de sesión y datos básicos de su perfil (nombre, correo y perfil), que se eliminan al cerrar sesión.`,
    ]},
    { title: '12. Vigencia y cambios', paragraphs: [
      `Versión ${L.version}, ${L.fecha}. Cualquier cambio sustancial se informará en la plataforma antes de aplicarse.`,
    ]},
  ],
};

const TERMINOS: LegalDoc = {
  title: 'Términos de uso',
  intro: `Estos términos regulan el uso de ${L.sistema}, plataforma de la ${L.dependencia} de la ${L.responsable} para la valoración y visualización de resultados de aprendizaje (Student Outcomes) del proceso de acreditación. Al iniciar sesión o usar la plataforma usted los acepta.`,
  sections: [
    { title: '1. Cuentas y acceso', paragraphs: [
      'Las cuentas son institucionales, las crean los administradores o coordinadores y son personales e intransferibles. Usted es responsable de la custodia de su contraseña y de toda actividad realizada con su cuenta. Informe de inmediato cualquier uso no autorizado.',
    ]},
    { title: '2. Uso permitido', items: [
      'Usar la plataforma solo para los fines académicos y de acreditación para los que fue creada y dentro de las funciones de su perfil.',
      'Cargar datos veraces, pertinentes y limitados a los campos solicitados; el profesor es responsable de las valoraciones que registra.',
      'Mantener la reserva sobre la información de los estudiantes y no copiarla, divulgarla ni usarla para otros fines.',
    ]},
    { title: '3. Usos prohibidos', items: [
      'Compartir credenciales o acceder con cuentas ajenas.',
      'Intentar acceder a datos o funciones fuera de su perfil, eludir los controles de seguridad, hacer pruebas de intrusión, ingeniería inversa o extracciones masivas automatizadas sin autorización escrita de la UNAB.',
      'Cargar contenido ilícito, datos sensibles o datos de personas ajenas al proceso.',
      'Afectar la disponibilidad de la plataforma.',
    ], paragraphs: ['El acceso abusivo a un sistema informático y otras conductas similares pueden constituir delitos conforme a la Ley 1273 de 2009, sin perjuicio de las sanciones disciplinarias que correspondan.']},
    { title: '4. Naturaleza de los indicadores', paragraphs: [
      'Los indicadores y gráficos son una herramienta de apoyo al mejoramiento continuo y reflejan los datos tal como los registraron los profesores. No constituyen una certificación, una decisión de acreditación ni una evaluación oficial de personas o programas.',
    ]},
    { title: '5. Propiedad intelectual', paragraphs: [
      `${L.sistema}, su código, diseño y documentación están protegidos por las normas de derechos de autor (Ley 23 de 1982 y Decisión Andina 351 de 1993). No se autoriza su copia o redistribución sin permiso expreso de sus titulares. Los datos cargados siguen siendo de la UNAB y de sus titulares.`,
    ]},
    { title: '6. Marcas y no afiliación', paragraphs: [
      `“ABET” es una marca de ABET, Inc. ${L.sistema} es una herramienta institucional de la UNAB y no está afiliada, patrocinada ni avalada por ABET, Inc. Los nombres y signos de la UNAB pertenecen a la UNAB.`,
    ]},
    { title: '7. Disponibilidad y responsabilidad', paragraphs: [
      'La plataforma se ofrece para apoyo del proceso institucional, sin garantía de disponibilidad ininterrumpida; puede suspenderse por mantenimiento o seguridad. En la medida permitida por la ley, la UNAB no responde por daños indirectos derivados del uso o la imposibilidad de uso, sin perjuicio de los derechos irrenunciables de los titulares de datos personales.',
    ]},
    { title: '8. Suspensión de cuentas', paragraphs: ['La UNAB podrá suspender o cerrar cuentas ante incumplimiento de estos términos, uso indebido o riesgo para la seguridad.']},
    { title: '9. Datos personales', paragraphs: ['El tratamiento de datos personales se rige por la Política de tratamiento de datos personales de esta plataforma.']},
    { title: '10. Ley aplicable y contacto', paragraphs: [
      `Estos términos se rigen por las leyes de la República de Colombia. Para consultas escriba a ${contacto}.`,
      `Versión ${L.version}, ${L.fecha}.`,
    ]},
  ],
};

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [CommonModule, RouterLink, LegalFooterComponent],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.scss',
})
export class LegalComponent implements OnInit {
  private route = inject(ActivatedRoute);
  key = signal<'privacidad' | 'terminos'>('privacidad');
  borrador = LEGAL.borrador;
  doc = signal<LegalDoc>(PRIVACIDAD);

  ngOnInit(): void {
    this.route.data.subscribe(d => {
      const k = d['doc'] === 'terminos' ? 'terminos' : 'privacidad';
      this.key.set(k);
      this.doc.set(k === 'terminos' ? TERMINOS : PRIVACIDAD);
      window.scrollTo({ top: 0 });
    });
  }
}
