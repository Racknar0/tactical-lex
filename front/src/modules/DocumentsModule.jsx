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
import VisorCapturaFpj5 from './VisorCapturaFpj5';
import VisorDocumentoLegal from './VisorDocumentoLegal';
import VisorInformePolicia from './VisorInformePolicia';
import VisorTutelaLegal from './VisorTutelaLegal';
import './DocumentsModule.css';

const CAPTURA_FPJ5 = 'Captura en Flagrancia (FPJ-5)';
const INFORME_NOVEDAD_POLICIAL = 'Informe de Novedad Policial';
const ACCION_TUTELA = 'Acción de Tutela';
const DERECHO_PETICION = 'Derecho de Petición';

const documentTypes = [
  CAPTURA_FPJ5,
  INFORME_NOVEDAD_POLICIAL,
  ACCION_TUTELA,
  DERECHO_PETICION,
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

const AUTOFILL_INFORME_POLICIAL_DATA = {
  grado: 'Patrullero',
  nombres: 'Juan Camilo Duarte Méndez',
  unidad: 'CAI Centro, Cuadrante 12',
  fechaHora: '2026-04-13T02:00',
  lugar: 'Calle 10 con Carrera 15, Duitama',
  relato:
    'Jefe, a las 2 am encontramos un man rompiendo la vitrina de la panadería, tocó esposarlo porque se puso agresivo y lo llevamos a la URI para dejarlo a disposición de la autoridad competente.',
};

const AUTOFILL_CAPTURA_FPJ5_DATA = {
  capturadorGradoNombres: 'Patrullero Juan Camilo Duarte Méndez',
  unidadCuadrante: 'CAI Centro, Cuadrante 12',
  indiciado: 'Sujeto masculino sin identificar (alias El Flaco)',
  presuntoDelito: 'Hurto',
  lugarFechaHora: 'Carrera Décima con Calle 15, Duitama - 13 de abril de 2026, 02:00 horas',
  relatoCaptura:
    'Jefe, nosotros íbamos en la moto por la carrera décima y vimos que una señora empezó a gritar que la robaron. Vimos a un muchacho de chaqueta negra corriendo con un bolso rojo en la mano. Aceleramos la moto, lo cerramos en la esquina de la calle 15 y el tipo tiró el bolso al piso. Lo requisamos, no tenía armas, le leímos los derechos y recuperamos el bolso de la señora que tenía un celular y 50 mil pesos. La señora llegó ahí y dijo que sí, que ese era el que la había robado.',
};

export default function DocumentsModule() {
  const { supportedModels, modelProfiles, selectedModel } = useApp();
  const [selectedType, setSelectedType] = useState(CAPTURA_FPJ5);
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

  const [policeForm, setPoliceForm] = useState({
    grado: 'Patrullero',
    nombres: '',
    unidad: '',
    fechaHora: '',
    lugar: '',
    relato: '',
  });

  const [captureForm, setCaptureForm] = useState({
    capturadorGradoNombres: '',
    unidadCuadrante: '',
    indiciado: '',
    presuntoDelito: 'Hurto',
    lugarFechaHora: '',
    relatoCaptura: '',
  });

  const effectiveModel = documentModel || selectedModel || modelProfiles[0]?.weight || supportedModels[0] || '';
  const effectiveModelProfile = modelProfiles.find((profile) => profile.weight === effectiveModel);

  const isCaptureType = selectedType === CAPTURA_FPJ5;
  const isPoliceType = selectedType === INFORME_NOVEDAD_POLICIAL;
  const isTutelaType = selectedType === ACCION_TUTELA;
  const isPetitionType = selectedType === DERECHO_PETICION;
  const isSupportedType = isCaptureType || isPoliceType || isTutelaType || isPetitionType;

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setSubmitError('');
    setGeneratedDocument(null);
    setGeneratedModel('');
    setGeneratedType('');
  };

  const handleAutofill = () => {
    const fillCapture = selectedType === CAPTURA_FPJ5;
    const fillPolice = selectedType === INFORME_NOVEDAD_POLICIAL;
    const fillTutela = selectedType === ACCION_TUTELA;
    setSelectedType(
      fillCapture
        ? CAPTURA_FPJ5
        : fillPolice
          ? INFORME_NOVEDAD_POLICIAL
        : fillTutela
          ? ACCION_TUTELA
          : DERECHO_PETICION
    );
    setSubmitError('');
    setGeneratedDocument(null);
    setGeneratedModel('');
    setGeneratedType('');

    if (fillCapture) {
      setCaptureForm({ ...AUTOFILL_CAPTURA_FPJ5_DATA });
      return;
    }

    if (fillPolice) {
      setPoliceForm({ ...AUTOFILL_INFORME_POLICIAL_DATA });
      return;
    }

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

  const handlePoliceInputChange = (event) => {
    const { name, value } = event.target;
    setPoliceForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCaptureInputChange = (event) => {
    const { name, value } = event.target;
    setCaptureForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isSupportedType) return;

    if (effectiveModelProfile?.weight === 'pesado') {
      const shouldContinue = window.confirm(
        `Has seleccionado el perfil ${effectiveModelProfile.display_name || 'Alto analisis (mas costo)'}. Este perfil ofrece mayor capacidad de razonamiento, pero incrementa el consumo de tokens, el costo y el tiempo de generación. ¿Deseas continuar?`
      );
      if (!shouldContinue) return;
    }

    setSubmitError('');
    setIsSubmitting(true);

    try {
      if (isCaptureType) {
        const response = await api('/generar-captura', {
          method: 'POST',
          timeoutMs: 180000,
          body: JSON.stringify({
            capturador: captureForm.capturadorGradoNombres,
            unidad: captureForm.unidadCuadrante,
            indiciado: captureForm.indiciado,
            presunto_delito: captureForm.presuntoDelito,
            lugar_fecha_hora: captureForm.lugarFechaHora,
            relato: captureForm.relatoCaptura,
            model: effectiveModel,
          }),
        });

        setGeneratedDocument(response.data);
        setGeneratedModel(response.modelHumanName || response.modelWeight || response.model || effectiveModel);
        setGeneratedType(CAPTURA_FPJ5);
        return;
      }

      if (isPoliceType) {
        const response = await api('/generar-informe-policia', {
          method: 'POST',
          timeoutMs: 180000,
          body: JSON.stringify({
            grado: policeForm.grado,
            nombres: policeForm.nombres,
            unidad: policeForm.unidad,
            fecha_hora: policeForm.fechaHora,
            lugar: policeForm.lugar,
            relato: policeForm.relato,
            model: effectiveModel,
          }),
        });

        setGeneratedDocument(response.data);
        setGeneratedModel(response.modelHumanName || response.modelWeight || response.model || effectiveModel);
        setGeneratedType(INFORME_NOVEDAD_POLICIAL);
        return;
      }

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
        setGeneratedModel(response.modelHumanName || response.modelWeight || response.model || effectiveModel);
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
      setGeneratedModel(response.modelHumanName || response.modelWeight || response.model || effectiveModel);
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
                {isCaptureType
                  ? 'Convierte el relato operativo en texto técnico listo para Formato FPJ-5 de Fiscalía.'
                  : isPoliceType
                  ? 'Redacta el informe institucional en segundos a partir del relato del uniformado.'
                  : isTutelaType
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
              {isCaptureType
                ? ' Autofill captura'
                : isPoliceType
                  ? ' Autofill informe'
                : isTutelaType
                  ? ' Autofill tutela'
                  : ' Autofill petición'}
            </GlowButton>
          </div>
        </div>

        {selectedType && !isSupportedType ? (
          <div className="docs-empty-state">
            Este tipo de documento estará disponible en una siguiente iteración. Por ahora puedes generar
            el flujo completo de <strong>{CAPTURA_FPJ5}</strong>, <strong>{INFORME_NOVEDAD_POLICIAL}</strong>,{' '}
            <strong>{ACCION_TUTELA}</strong> y <strong>{DERECHO_PETICION}</strong>.
          </div>
        ) : null}

        {isSupportedType ? (
          <div className={`docs-document-layout ${generatedDocument ? 'with-preview' : ''}`}>
            <form className="docs-form" onSubmit={handleSubmit}>
              <div className="docs-form-section">
                <h4>0. Configuración de generación</h4>

                <label className="docs-form-field">
                  <span>Perfil de IA para redacción</span>
                  <div className="docs-input-wrap">
                    <Sparkles size={16} />
                    <select
                      name="documentModel"
                      value={effectiveModel}
                      onChange={(event) => setDocumentModel(event.target.value)}
                      required
                    >
                      {modelProfiles.length ? (
                        modelProfiles.map((profile) => (
                          <option
                            key={profile.weight}
                            value={profile.weight}
                            title={profile.tooltips?.module_documents || ''}
                          >
                            {profile.display_name || profile.human_name}
                          </option>
                        ))
                      ) : (
                        supportedModels.length ? (
                          supportedModels.map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))
                        ) : (
                          <option value="">Cargando modelos disponibles...</option>
                        )
                      )}
                    </select>
                  </div>
                  {effectiveModelProfile?.tooltips?.module_documents ? (
                    <div className="docs-profile-tip" role="note">
                      <strong>
                        Perfil IA seleccionado: {effectiveModelProfile.display_name || effectiveModelProfile.human_name}
                      </strong>
                      <small className="docs-field-help">{effectiveModelProfile.tooltips.module_documents}</small>
                    </div>
                  ) : null}
                </label>
              </div>

              {isCaptureType ? (
                <>
                  <div className="docs-form-section">
                    <h4>1. Datos del Capturador (El Policía)</h4>

                    <label className="docs-form-field">
                      <span>Grado y Nombres</span>
                      <div className="docs-input-wrap">
                        <ShieldCheck size={16} />
                        <input
                          type="text"
                          name="capturadorGradoNombres"
                          value={captureForm.capturadorGradoNombres}
                          onChange={handleCaptureInputChange}
                          placeholder="Ej: Patrullero Juan Pérez"
                          required
                        />
                      </div>
                    </label>

                    <label className="docs-form-field">
                      <span>Cuadrante / Unidad</span>
                      <div className="docs-input-wrap">
                        <Building2 size={16} />
                        <input
                          type="text"
                          name="unidadCuadrante"
                          value={captureForm.unidadCuadrante}
                          onChange={handleCaptureInputChange}
                          placeholder="Ej: CAI Centro, Cuadrante 12"
                          required
                        />
                      </div>
                    </label>
                  </div>

                  <div className="docs-form-section">
                    <h4>2. Datos del Indiciado (El Capturado)</h4>

                    <label className="docs-form-field">
                      <span>Nombres y Apellidos (o Alias)</span>
                      <div className="docs-input-wrap">
                        <UserSquare size={16} />
                        <input
                          type="text"
                          name="indiciado"
                          value={captureForm.indiciado}
                          onChange={handleCaptureInputChange}
                          placeholder="Ej: Carlos Díaz / Alias El Mono"
                          required
                        />
                      </div>
                    </label>

                    <label className="docs-form-field">
                      <span>Presunto Delito</span>
                      <div className="docs-input-wrap">
                        <Gavel size={16} />
                        <select
                          name="presuntoDelito"
                          value={captureForm.presuntoDelito}
                          onChange={handleCaptureInputChange}
                          required
                        >
                          <option value="Hurto">Hurto</option>
                          <option value="Tráfico de Estupefacientes">Tráfico de Estupefacientes</option>
                          <option value="Lesiones Personales">Lesiones Personales</option>
                          <option value="Daño en Bien Ajeno">Daño en Bien Ajeno</option>
                        </select>
                      </div>
                    </label>
                  </div>

                  <div className="docs-form-section">
                    <h4>3. Circunstancias de la Captura</h4>

                    <label className="docs-form-field">
                      <span>Lugar, Fecha y Hora</span>
                      <div className="docs-input-wrap">
                        <FileText size={16} />
                        <input
                          type="text"
                          name="lugarFechaHora"
                          value={captureForm.lugarFechaHora}
                          onChange={handleCaptureInputChange}
                          placeholder="Ej: Carrera Décima con Calle 15, Duitama - 13/04/2026 02:00"
                          required
                        />
                      </div>
                    </label>

                    <label className="docs-form-field">
                      <span>Relato de la Captura</span>
                      <div className="docs-input-wrap docs-textarea-wrap">
                        <ScrollText size={16} />
                        <textarea
                          name="relatoCaptura"
                          value={captureForm.relatoCaptura}
                          onChange={handleCaptureInputChange}
                          placeholder="Narre cómo lo cogió. Ej: Íbamos patrullando y escuchamos un grito, el tipo iba corriendo con un celular..."
                          rows={8}
                          required
                        />
                      </div>
                    </label>
                  </div>
                </>
              ) : isPoliceType ? (
                <>
                  <div className="docs-form-section">
                    <h4>1. Datos del Uniformado (Quién reporta)</h4>

                    <label className="docs-form-field">
                      <span>Grado</span>
                      <div className="docs-input-wrap">
                        <ShieldCheck size={16} />
                        <select
                          name="grado"
                          value={policeForm.grado}
                          onChange={handlePoliceInputChange}
                          required
                        >
                          <option value="Patrullero">Patrullero</option>
                          <option value="Subintendente">Subintendente</option>
                          <option value="Intendente">Intendente</option>
                          <option value="Teniente">Teniente</option>
                        </select>
                      </div>
                    </label>

                    <label className="docs-form-field">
                      <span>Nombres y Apellidos</span>
                      <div className="docs-input-wrap">
                        <UserSquare size={16} />
                        <input
                          type="text"
                          name="nombres"
                          value={policeForm.nombres}
                          onChange={handlePoliceInputChange}
                          placeholder="Ej: Juan Carlos Pérez Gómez"
                          required
                        />
                      </div>
                    </label>

                    <label className="docs-form-field">
                      <span>Unidad / Cuadrante</span>
                      <div className="docs-input-wrap">
                        <Building2 size={16} />
                        <input
                          type="text"
                          name="unidad"
                          value={policeForm.unidad}
                          onChange={handlePoliceInputChange}
                          placeholder="Ej: CAI Centro, Cuadrante 12"
                          required
                        />
                      </div>
                    </label>
                  </div>

                  <div className="docs-form-section">
                    <h4>2. Datos de la Novedad (El suceso)</h4>

                    <label className="docs-form-field">
                      <span>Fecha y Hora de los hechos</span>
                      <div className="docs-input-wrap">
                        <FileText size={16} />
                        <input
                          type="datetime-local"
                          name="fechaHora"
                          value={policeForm.fechaHora}
                          onChange={handlePoliceInputChange}
                          required
                        />
                      </div>
                    </label>

                    <label className="docs-form-field">
                      <span>Lugar de los hechos</span>
                      <div className="docs-input-wrap">
                        <Building2 size={16} />
                        <input
                          type="text"
                          name="lugar"
                          value={policeForm.lugar}
                          onChange={handlePoliceInputChange}
                          placeholder="Ej: Calle 10 con Carrera 15"
                          required
                        />
                      </div>
                    </label>

                    <label className="docs-form-field">
                      <span>Relato de la Novedad</span>
                      <div className="docs-input-wrap docs-textarea-wrap">
                        <ScrollText size={16} />
                        <textarea
                          name="relato"
                          value={policeForm.relato}
                          onChange={handlePoliceInputChange}
                          placeholder="Narre lo que pasó en sus propias palabras. Ej: Jefe, a las 2 am encontramos un man rompiendo la vitrina de la panadería, tocó esposarlo porque se puso agresivo y lo llevamos a la URI..."
                          rows={7}
                          required
                        />
                      </div>
                    </label>
                  </div>
                </>
              ) : isPetitionType ? (
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
                    : isCaptureType
                      ? ' Generar captura'
                      : isPoliceType
                        ? ' Generar informe'
                      : isTutelaType
                        ? ' Generar tutela'
                        : ' Generar documento'}
                </GlowButton>
              </div>

              {submitError ? <p className="docs-submit-error">{submitError}</p> : null}
            </form>

            {generatedDocument ? (
              <div className="docs-preview-pane">
                {generatedType === CAPTURA_FPJ5 ? (
                  <VisorCapturaFpj5
                    form={captureForm}
                    generatedData={generatedDocument}
                    selectedModel={generatedModel}
                  />
                ) : generatedType === INFORME_NOVEDAD_POLICIAL ? (
                  <VisorInformePolicia
                    form={policeForm}
                    generatedData={generatedDocument}
                    selectedModel={generatedModel}
                  />
                ) : generatedType === ACCION_TUTELA ? (
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
