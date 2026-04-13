import { useState } from 'react';
import {
  Building2,
  FileText,
  Gavel,
  Mail,
  PanelLeft,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserSquare,
} from 'lucide-react';
import GlowButton from '../components/GlowButton';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';
import VisorDocumentoLegal from './VisorDocumentoLegal';
import VisorTutelaLegal from './VisorTutelaLegal';
import './DocumentsModule.css';

const ACCION_TUTELA = 'Acción de Tutela';
const DERECHO_PETICION = 'Derecho de Petición';

const documentTypes = [
  ACCION_TUTELA,
  DERECHO_PETICION,
  'Tipo documento 2',
  'Tipo documento 3',
  'Tipo documento 4',
  'Tipo documento 5',
];

const AUTOFILL_PETICION_DATA = {
  nombresApellidos: 'Carlos Arturo Gómez Pérez',
  tipoDocumento: 'Cédula de Ciudadanía',
  numeroDocumento: '1045678912',
  direccionNotificacion: 'Calle 15 # 14-23, Barrio Centro, Duitama, Boyacá.',
  correoElectronico: 'carlos.gomez.pol@ejemplo.com',
  nombreEntidad: 'Comandante Estación de Policía de Duitama',
  objetoPeticion: 'Solicitud copia de minuta de guardia del 10 de abril de 2026',
  razonesHechos:
    'Lo que pasa es que el 10 de abril yo estaba prestando turno en la guardia principal desde las 6:00 am hasta las 6:00 pm. Resulta que necesito la copia de esa minuta porque me la están pidiendo en la oficina de talento humano para poder certificarme unas horas extras y un recargo de ese mes. Me dijeron que sin la copia de esa anotación donde consta mi servicio, no me pueden pasar el reporte para el pago, y pues ahí en el libro está todo anotado con mi firma.',
  relacionDocumentos:
    '1. Fotocopia de mi cédula de ciudadanía ampliada al 150%.\n2. Un pantallazo del cuadro de turnos que mandaron por el grupo de WhatsApp donde salgo programado para ese día.',
};

const AUTOFILL_TUTELA_DATA = {
  nombresApellidos: 'María Teresa Rojas Bernal',
  tipoDocumento: 'Cédula de Ciudadanía',
  numeroDocumento: '40123456',
  direccionNotificacion: 'Carrera 16 # 20-50, Barrio Las Américas, Duitama.',
  correoElectronico: 'mariateresa.rojas1980@ejemplo.com',
  entidadAccionada: 'Nueva EPS (Regional Boyacá)',
  derechoVulnerado:
    'Derecho fundamental a la salud, a la vida en condiciones dignas y a la seguridad social.',
  hechosTutela:
    'Imagínese señor juez que yo sufro de diabetes severa y el especialista me mandó una insulina especial desde hace dos meses. Fui a la farmacia de la EPS aquí en Duitama a reclamarla y siempre me salen con el cuento de que no hay sistema o que el medicamento está agotado por el proveedor. Yo no tengo plata para comprar eso por fuera porque vale como 300 mil pesos y yo vivo del rebusque, y si no me aplico esa insulina me puedo hasta morir de un coma diabético porque se me sube el azúcar terrible.',
  pretension:
    'Que por favor le ordenen a la Nueva EPS entregarme la insulina en menos de 48 horas y que me garanticen el tratamiento integral de aquí en adelante sin ponerme tantas trabas ni hacerme voltear más.',
  relacionPruebas:
    'Copia de la historia clínica.\n\nCopia de la fórmula médica donde me recetan la insulina.\n\nFotocopia de mi cédula ampliada.',
};

export default function DocumentsModule() {
  const { supportedModels, selectedModel } = useApp();
  const [selectedType, setSelectedType] = useState(ACCION_TUTELA);
  const [documentModel, setDocumentModel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [generatedDocument, setGeneratedDocument] = useState(null);
  const [generatedModel, setGeneratedModel] = useState('');
  const [generatedType, setGeneratedType] = useState('');

  const [petitionForm, setPetitionForm] = useState({
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

  const [tutelaForm, setTutelaForm] = useState({
    nombresApellidos: '',
    tipoDocumento: 'Cédula de Ciudadanía',
    numeroDocumento: '',
    direccionNotificacion: '',
    correoElectronico: '',
    entidadAccionada: '',
    derechoVulnerado: '',
    hechosTutela: '',
    pretension: '',
    relacionPruebas: '',
  });

  const effectiveModel = documentModel || selectedModel || supportedModels[0] || '';

  const isTutelaType = selectedType === ACCION_TUTELA;
  const isPetitionType = selectedType === DERECHO_PETICION;
  const isSupportedType = isTutelaType || isPetitionType;

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setSubmitError('');
    setGeneratedDocument(null);
    setGeneratedModel('');
    setGeneratedType('');
  };

  const handleAutofill = () => {
    const fillTutela = selectedType === ACCION_TUTELA;
    setSelectedType(fillTutela ? ACCION_TUTELA : DERECHO_PETICION);
    setSubmitError('');
    setGeneratedDocument(null);
    setGeneratedModel('');
    setGeneratedType('');

    if (fillTutela) {
      setTutelaForm({ ...AUTOFILL_TUTELA_DATA });
      return;
    }

    setPetitionForm({ ...AUTOFILL_PETICION_DATA });
  };

  const handlePetitionInputChange = (event) => {
    const { name, value } = event.target;
    setPetitionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTutelaInputChange = (event) => {
    const { name, value } = event.target;
    setTutelaForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isSupportedType) return;

    setSubmitError('');
    setIsSubmitting(true);

    try {
      if (isPetitionType) {
        const response = await api('/generar-peticion', {
          method: 'POST',
          timeoutMs: 180000,
          body: JSON.stringify({
            nombres: petitionForm.nombresApellidos,
            cedula: petitionForm.numeroDocumento,
            entidad: petitionForm.nombreEntidad,
            objeto: petitionForm.objetoPeticion,
            hechos: petitionForm.razonesHechos,
            model: effectiveModel,
            tipoDocumento: petitionForm.tipoDocumento,
            direccionNotificacion: petitionForm.direccionNotificacion,
            correoElectronico: petitionForm.correoElectronico,
            relacionDocumentos: petitionForm.relacionDocumentos,
          }),
        });

        setGeneratedDocument(response.data);
        setGeneratedModel(response.model || effectiveModel);
        setGeneratedType(DERECHO_PETICION);
        return;
      }

      const response = await api('/generar-tutela', {
        method: 'POST',
        timeoutMs: 180000,
        body: JSON.stringify({
          nombres: tutelaForm.nombresApellidos,
          cedula: tutelaForm.numeroDocumento,
          entidad_accionada: tutelaForm.entidadAccionada,
          derecho_vulnerado: tutelaForm.derechoVulnerado,
          hechos: tutelaForm.hechosTutela,
          pretension: tutelaForm.pretension,
          model: effectiveModel,
          tipoDocumento: tutelaForm.tipoDocumento,
          direccionNotificacion: tutelaForm.direccionNotificacion,
          correoElectronico: tutelaForm.correoElectronico,
          relacionPruebas: tutelaForm.relacionPruebas,
        }),
      });

      setGeneratedDocument(response.data);
      setGeneratedModel(response.model || effectiveModel);
      setGeneratedType(ACCION_TUTELA);
    } catch (error) {
      setSubmitError(error.message || 'No fue posible generar el documento.');
    } finally {
      setIsSubmitting(false);
    }
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
              onClick={() => handleTypeSelect(type)}
            >
              <FileText size={16} />
              <span>{type}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="docs-right-panel">
        <div className="docs-form-header">
          <div className="docs-form-title">
            <div className="docs-form-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2>{selectedType || 'Selecciona un tipo de documento'}</h2>
              <p>
                {isTutelaType
                  ? 'Completa la información de la acción y genera la tutela con IA + RAG.'
                  : isPetitionType
                    ? 'Completa la información base y genera el borrador jurídico con IA + RAG.'
                  : 'Completa la información base del titular del documento.'}
              </p>
            </div>
          </div>

          <div className="docs-header-actions">
            <GlowButton type="button" size="small" variant="ghost" onClick={handleAutofill}>
              <Sparkles size={14} />
              {isTutelaType ? ' Autofill tutela' : ' Autofill petición'}
            </GlowButton>
          </div>
        </div>

        {selectedType && !isSupportedType ? (
          <div className="docs-empty-state">
            Este tipo de documento estará disponible en una siguiente iteración. Por ahora puedes generar
            el flujo completo de <strong>{ACCION_TUTELA}</strong> y <strong>{DERECHO_PETICION}</strong>.
          </div>
        ) : null}

        {isSupportedType ? (
          <div className={`docs-document-layout ${generatedDocument ? 'with-preview' : ''}`}>
            <form className="docs-form" onSubmit={handleSubmit}>
              <div className="docs-form-section">
                <h4>0. Configuración de generación</h4>

                <label className="docs-form-field">
                  <span>Modelo de IA para redacción</span>
                  <div className="docs-input-wrap">
                    <Sparkles size={16} />
                    <select
                      name="documentModel"
                      value={effectiveModel}
                      onChange={(event) => setDocumentModel(event.target.value)}
                      required
                    >
                      {supportedModels.length ? (
                        supportedModels.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))
                      ) : (
                        <option value="">Cargando modelos disponibles...</option>
                      )}
                    </select>
                  </div>
                </label>
              </div>

              {isPetitionType ? (
                <>
                  <div className="docs-form-section">
                    <h4>1. Datos del Solicitante (Quién pide)</h4>

                    <label className="docs-form-field">
                      <span>Nombres y Apellidos Completos</span>
                      <div className="docs-input-wrap">
                        <UserSquare size={16} />
                        <input
                          type="text"
                          name="nombresApellidos"
                          value={petitionForm.nombresApellidos}
                          onChange={handlePetitionInputChange}
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
                          value={petitionForm.tipoDocumento}
                          onChange={handlePetitionInputChange}
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
                          value={petitionForm.numeroDocumento}
                          onChange={handlePetitionInputChange}
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
                          value={petitionForm.direccionNotificacion}
                          onChange={handlePetitionInputChange}
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
                          value={petitionForm.correoElectronico}
                          onChange={handlePetitionInputChange}
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
                          value={petitionForm.nombreEntidad}
                          onChange={handlePetitionInputChange}
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
                          value={petitionForm.objetoPeticion}
                          onChange={handlePetitionInputChange}
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
                          value={petitionForm.razonesHechos}
                          onChange={handlePetitionInputChange}
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
                          value={petitionForm.relacionDocumentos}
                          onChange={handlePetitionInputChange}
                          placeholder="¿Tiene alguna prueba? Menciónela aquí. Ej: Adjunto copia de la minuta de servicio."
                          rows={3}
                        />
                      </div>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="docs-form-section">
                    <h4>1. Datos del Accionante (El que interpone la tutela)</h4>

                    <label className="docs-form-field">
                      <span>Nombres y Apellidos Completos</span>
                      <div className="docs-input-wrap">
                        <UserSquare size={16} />
                        <input
                          type="text"
                          name="nombresApellidos"
                          value={tutelaForm.nombresApellidos}
                          onChange={handleTutelaInputChange}
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
                          value={tutelaForm.tipoDocumento}
                          onChange={handleTutelaInputChange}
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
                          value={tutelaForm.numeroDocumento}
                          onChange={handleTutelaInputChange}
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
                          value={tutelaForm.direccionNotificacion}
                          onChange={handleTutelaInputChange}
                          placeholder="Ej: Calle 10 # 12-30, Duitama"
                          required
                        />
                      </div>
                    </label>

                    <label className="docs-form-field">
                      <span>Correo Electrónico</span>
                      <div className="docs-input-wrap">
                        <Mail size={16} />
                        <input
                          type="text"
                          name="correoElectronico"
                          value={tutelaForm.correoElectronico}
                          onChange={handleTutelaInputChange}
                          placeholder="Ej: usuario@correo.com"
                        />
                      </div>
                    </label>
                  </div>

                  <div className="docs-form-section">
                    <h4>2. Datos de la Entidad Accionada (Contra quién es la demanda)</h4>

                    <label className="docs-form-field">
                      <span>Nombre de la Entidad o Autoridad</span>
                      <div className="docs-input-wrap">
                        <Building2 size={16} />
                        <input
                          type="text"
                          name="entidadAccionada"
                          value={tutelaForm.entidadAccionada}
                          onChange={handleTutelaInputChange}
                          placeholder="Ej: EPS Sanitas, Policía Nacional, Secretaría de Salud"
                          required
                        />
                      </div>
                    </label>
                  </div>

                  <div className="docs-form-section">
                    <h4>3. El Cuerpo de la Tutela</h4>

                    <label className="docs-form-field">
                      <span>Derecho Fundamental Vulnerado</span>
                      <div className="docs-input-wrap">
                        <Gavel size={16} />
                        <input
                          type="text"
                          name="derechoVulnerado"
                          value={tutelaForm.derechoVulnerado}
                          onChange={handleTutelaInputChange}
                          placeholder="Ej: Derecho a la Salud, Derecho a la Vida, Derecho de Petición, Mínimo Vital."
                          required
                        />
                      </div>
                    </label>

                    <label className="docs-form-field">
                      <span>Los Hechos</span>
                      <div className="docs-input-wrap docs-textarea-wrap">
                        <ScrollText size={16} />
                        <textarea
                          name="hechosTutela"
                          value={tutelaForm.hechosTutela}
                          onChange={handleTutelaInputChange}
                          placeholder="Narre cronológicamente qué pasó. Ej: El día 10 de marzo me recetaron un medicamento vital y la EPS me dice que no hay agenda para entregarlo..."
                          rows={6}
                          required
                        />
                      </div>
                    </label>

                    <label className="docs-form-field">
                      <span>Lo que solicita al Juez (Pretensión)</span>
                      <div className="docs-input-wrap docs-textarea-wrap">
                        <Gavel size={16} />
                        <textarea
                          name="pretension"
                          value={tutelaForm.pretension}
                          onChange={handleTutelaInputChange}
                          placeholder="¿Qué orden quiere que dé el juez? Ej: Que se le ordene a la EPS entregarme el medicamento en las próximas 48 horas."
                          rows={3}
                          required
                        />
                      </div>
                    </label>

                    <label className="docs-form-field">
                      <span>Relación de Pruebas (Opcional)</span>
                      <div className="docs-input-wrap docs-textarea-wrap">
                        <FileText size={16} />
                        <textarea
                          name="relacionPruebas"
                          value={tutelaForm.relacionPruebas}
                          onChange={handleTutelaInputChange}
                          placeholder="Ej: Adjunto copia de la historia clínica y fórmula médica."
                          rows={3}
                        />
                      </div>
                    </label>
                  </div>
                </>
              )}

              <div className="docs-form-actions">
                <GlowButton type="submit" loading={isSubmitting} disabled={!effectiveModel}>
                  <FileText size={16} />
                  {isSubmitting
                    ? ' Generando documento...'
                    : isTutelaType
                      ? ' Generar tutela'
                      : ' Generar documento'}
                </GlowButton>
              </div>

              {submitError ? <p className="docs-submit-error">{submitError}</p> : null}
            </form>

            {generatedDocument ? (
              <div className="docs-preview-pane">
                {generatedType === ACCION_TUTELA ? (
                  <VisorTutelaLegal
                    form={tutelaForm}
                    generatedData={generatedDocument}
                    selectedModel={generatedModel}
                  />
                ) : (
                  <VisorDocumentoLegal
                    form={petitionForm}
                    generatedData={generatedDocument}
                    selectedModel={generatedModel}
                  />
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="docs-empty-state">
            Selecciona una cajita en el panel izquierdo para habilitar el formulario de recolección legal.
          </div>
        )}
      </section>
    </div>
  );
}
