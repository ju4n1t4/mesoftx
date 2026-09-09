import { Component } from '@angular/core';

@Component({
  selector: 'app-informes',
  standalone: true,
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Análisis e informes</h1>
        <p>Visualización de indicadores consolidados ABET mediante Power BI.</p>
      </div>
      <div class="pbi-container">
        <div class="pbi-header">
          <div class="pbi-title"><i class="pi pi-chart-bar"></i> Panel Power BI</div>
          <span class="pbi-status"><span class="dot green"></span> Conectado</span>
        </div>
        <div class="pbi-frame">
          <div class="pbi-placeholder">
            <i class="pi pi-chart-bar pbi-icon"></i>
            <h3>Informe Power BI</h3>
            <p>El contenedor de Power BI se cargará aquí una vez configurado el workspace de Power BI Embedded.</p>
            <div class="pbi-config-note">
              <i class="pi pi-info-circle"></i>
              Configura tu <strong>workspace ID</strong> y <strong>report ID</strong> en el panel de configuración para activar esta vista.
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pbi-container{background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;}
    .pbi-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border);}
    .pbi-title{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:var(--text);}
    .pbi-title i{color:var(--accent);}
    .pbi-status{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--badge-open);font-weight:600;}
    .dot{width:7px;height:7px;border-radius:50%;}
    .dot.green{background:var(--badge-open);}
    .pbi-frame{min-height:500px;display:flex;align-items:center;justify-content:center;background:var(--page-bg);}
    .pbi-placeholder{text-align:center;max-width:420px;padding:40px;}
    .pbi-icon{font-size:48px;color:var(--border);margin-bottom:16px;display:block;}
    .pbi-placeholder h3{font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px;}
    .pbi-placeholder p{font-size:14px;color:var(--text-muted);line-height:1.6;margin-bottom:20px;}
    .pbi-config-note{background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.2);border-radius:var(--radius-sm);padding:12px 16px;font-size:13px;color:var(--text-muted);display:flex;align-items:flex-start;gap:8px;text-align:left;}
    .pbi-config-note i{color:var(--accent);flex-shrink:0;margin-top:1px;}
  `]
})
export class InformesComponent {}
