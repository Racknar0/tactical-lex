import { useState } from 'react';
import { Building2, FileText, Mail, PanelLeft, ScrollText, ShieldCheck, UserSquare } from 'lucide-react';
import GlowButton from '../components/GlowButton';
import './DocumentsModule.css';

const documentTypes = [
  'Derecho de Petición',
  'Tipo documento 2',
  'Tipo documento 3',
  'Tipo documento 4',
  'Tipo documento 5',
];

export default function DocumentsModule() {
  const [selectedType, setSelectedType] = useState(null);
  const [form, setForm] = useState({
    nombresApellidos: '',
    tipoDocumento: 'Cédula de Ciudadanía',
    numeroDocumento: '',
    direccionNotificacion: '',
    correoElectronico: '',
    nombreEntidad: '',
    objetoPeticion: '',
    razonesHechos: '',
    relacionDocumentos: '',
  });

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
  };

  return (
    <div className="docs-module">
      <aside className="docs-left-panel">
        <div className="docs-left-header">
          <PanelLeft size={18} />
          <h3>Tipo de Documento</h3>
        </div>

        <div className="docs-type-list">
          {documentTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={`docs-type-card ${selectedType === type ? 'active' : ''}`}
              onClick={() => setSelectedType(type)}
            >
              <FileText size={16} />
              <span>{type}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="docs-right-panel">
        <div className="docs-form-header">
          <div className="docs-form-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2>{selectedType || 'Selecciona un tipo de documento'}</h2>
            <p>Completa la información base del titular del documento.</p>
          </div>
        </div>

        {selectedType ? (
          <form className="docs-form" onSubmit={handleSubmit}>
            <div className="docs-form-section">
              <h4>1. Datos del Solicitante (Quién pide)</h4>

              <label className="docs-form-field">
                <span>Nombres y Apellidos Completos</span>
                <div className="docs-input-wrap">
                  <UserSquare size={16} />
                  <input
                    type="text"
                    name="nombresApellidos"
                    value={form.nombresApellidos}
                    onChange={handleInputChange}
                    placeholder="Ej: Juan Carlos Pérez Gómez"
                    required
                  />
                </div>
              </label>

              <label className="docs-form-field">
                <span>Tipo de Documento</span>
                <div className="docs-input-wrap">
                  <FileText size={16} />
                  <select
                    name="tipoDocumento"
                    value={form.tipoDocumento}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Cédula de Ciudadanía">Cédula de Ciudadanía</option>
                    <option value="Pasaporte">Pasaporte</option>
                    <option value="Cédula de Extranjería">Cédula de Extranjería</option>
                  </select>
                </div>
              </label>

              <label className="docs-form-field">
                <span>Número de Documento</span>
                <div className="docs-input-wrap">
                  <FileText size={16} />
                  <input
                    type="text"
                    inputMode="numeric"
                    name="numeroDocumento"
                    value={form.numeroDocumento}
                    onChange={handleInputChange}
                    placeholder="Ej: 1234567890"
                    required
                  />
                </div>
              </label>

              <label className="docs-form-field">
                <span>Dirección de Notificación</span>
                <div className="docs-input-wrap">
                  <Building2 size={16} />
                  <input
                    type="text"
                    name="direccionNotificacion"
                    value={form.direccionNotificacion}
                    onChange={handleInputChange}
                    placeholder="Ej: Calle 10 # 12-30, Duitama"
                    required
                  />
                </div>
              </label>

              <label className="docs-form-field">
                <span>Correo Electrónico (Opcional)</span>
                <div className="docs-input-wrap">
                  <Mail size={16} />
                  <input
                    type="email"
                    name="correoElectronico"
                    value={form.correoElectronico}
                    onChange={handleInputChange}
                    placeholder="Ej: usuario@correo.com"
                  />
                </div>
              </label>
            </div>

            <div className="docs-form-section">
              <h4>2. Datos de la Entidad (A quién se le pide)</h4>

              <label className="docs-form-field">
                <span>Nombre de la Entidad o Autoridad Dirigida</span>
                <div className="docs-input-wrap">
                  <Building2 size={16} />
                  <input
                    type="text"
                    name="nombreEntidad"
                    value={form.nombreEntidad}
                    onChange={handleInputChange}
                    placeholder="Ej: Alcaldía de Duitama"
                    required
                  />
                </div>
              </label>
            </div>

            <div className="docs-form-section">
              <h4>3. El Cuerpo de la Petición</h4>

              <label className="docs-form-field">
                <span>El Objeto de la Petición</span>
                <div className="docs-input-wrap docs-textarea-wrap">
                  <ScrollText size={16} />
                  <textarea
                    name="objetoPeticion"
                    value={form.objetoPeticion}
                    onChange={handleInputChange}
                    placeholder="Ej: Solicito copia del informe policial del día X, o solicito el pago de mis vacaciones atrasadas."
                    rows={3}
                    required
                  />
                </div>
              </label>

              <label className="docs-form-field">
                <span>Las Razones o Hechos</span>
                <div className="docs-input-wrap docs-textarea-wrap">
                  <ScrollText size={16} />
                  <textarea
                    name="razonesHechos"
                    value={form.razonesHechos}
                    onChange={handleInputChange}
                    placeholder="Narre aquí qué fue lo que pasó. Escriba de forma sencilla, la IA se encargará de redactarlo formalmente. Ej: El día 20 de marzo trabajé doble turno y no me lo pagaron..."
                    rows={6}
                    required
                  />
                </div>
              </label>

              <label className="docs-form-field">
                <span>Relación de Documentos (Pruebas) - Opcional</span>
                <div className="docs-input-wrap docs-textarea-wrap">
                  <FileText size={16} />
                  <textarea
                    name="relacionDocumentos"
                    value={form.relacionDocumentos}
                    onChange={handleInputChange}
                    placeholder="¿Tiene alguna prueba? Menciónela aquí. Ej: Adjunto copia de la minuta de servicio."
                    rows={3}
                  />
                </div>
              </label>
            </div>

            <div className="docs-form-actions">
              <GlowButton type="submit">
                <FileText size={16} /> Generar documento
              </GlowButton>
            </div>
          </form>
        ) : (
          <div className="docs-empty-state">
            Selecciona una cajita en el panel izquierdo para habilitar el formulario de recolección legal.
          </div>
        )}
      </section>
    </div>
  );
}
