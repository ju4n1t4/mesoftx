/**
 * Datos del responsable del tratamiento que aparecen en los textos legales.
 * Complete los campos vacíos con la información oficial de la UNAB y ponga
 * `borrador: false` cuando la Oficina Jurídica / Oficial de Protección de Datos
 * apruebe los textos. Los campos vacíos no se muestran.
 */
export const LEGAL = {
  responsable: 'Universidad Autónoma de Bucaramanga (UNAB)',
  dependencia: 'Facultad de Ingeniería',
  sistema: 'MESOFTX',
  nit: '',                         // p. ej. NIT de la UNAB
  direccion: '',                   // dirección física para notificaciones
  telefono: '',
  correoDatos: 'soporte.mesoftx@unab.edu.co',   // canal de consultas y reclamos (confirmar con la UNAB)
  politicaInstitucionalUrl: '',    // URL de la Política de Tratamiento de Datos de la UNAB
  version: '1.0',
  fecha: '18 de octubre de 2026',
  /** true mientras los textos no hayan sido aprobados por la UNAB. */
  borrador: true,
};
