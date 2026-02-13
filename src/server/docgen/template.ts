import type { FichaPayload } from "@/lib/validators";

export type TemplateMapped = {
  section1: string;
  section2: string;
  section3: string;
  section4: string;
  section5: string;
  section6: string;
  section7: string;
  section8: string;
  section9: string;
  section10: string;
  section11: string;
};

function withLabel(label: string, value: string) {
  const trimmed = value.trim();
  return trimmed ? `${label}${trimmed}` : "";
}

function joinLines(lines: string[]) {
  return lines.filter((line) => line.trim().length > 0).join("\n");
}

export function mapPayloadToTemplate(payload: FichaPayload): TemplateMapped {
  return {
    section1: joinLines([
      withLabel("CDI: ", payload.expedientes.cdi),
      withLabel("CP: ", payload.expedientes.cp),
      withLabel("CARPETA JUDICIAL: ", payload.expedientes.carpetaJudicial),
      withLabel("JUICIO ORAL: ", payload.expedientes.juicioOral),
    ]),
    section2: joinLines([
      payload.fechaHora.fecha,
      payload.fechaHora.horaProgramada,
      payload.fechaHora.horaInicio,
      payload.fechaHora.horaTermino,
    ]),
    section3: payload.delito.nombre,
    section4: payload.imputado.nombreCompleto,
    section5: payload.ofendido.nombreCompleto,
    section6: payload.hecho.descripcion,
    section7: joinLines([
      payload.audiencia.tipo,
      withLabel("ETAPA: ", payload.audiencia.etapa),
      withLabel("MODALIDAD: ", payload.audiencia.modalidad),
    ]),
    section8: joinLines([
      withLabel("JUEZ: ", payload.autoridades.juez),
      withLabel("MP: ", payload.autoridades.mp),
      withLabel("DEFENSA: ", payload.autoridades.defensa),
      withLabel("ASESOR: ", payload.autoridades.asesorJuridico),
      withLabel("OBS: ", payload.autoridades.observacion),
    ]),
    section9: payload.resultado.descripcion,
    section10: joinLines([
      payload.medidaCautelar.descripcion,
      withLabel("TIPO: ", payload.medidaCautelar.tipo),
      withLabel("FUNDAMENTO: ", payload.medidaCautelar.fundamento),
    ]),
    section11: joinLines([
      payload.observaciones.texto,
      payload.observaciones.relevancia
        ? `RELEVANCIA: ${payload.observaciones.relevancia}`
        : "",
      payload.observaciones.violenciaGenero ? "VIOLENCIA DE GENERO" : "",
    ]),
  };
}

export function fitText(text: string, baseFontSize = 13, minFontSize = 9, baseLimit = 380) {
  const normalized = text.trim();
  if (!normalized) {
    return { text: "", fontSize: baseFontSize };
  }

  let fontSize = baseFontSize;
  let dynamicLimit = baseLimit;

  while (normalized.length > dynamicLimit && fontSize > minFontSize) {
    fontSize -= 1;
    dynamicLimit = Math.floor(baseLimit * (baseFontSize / fontSize));
  }

  if (normalized.length > dynamicLimit) {
    return {
      text: `${normalized.slice(0, Math.max(dynamicLimit - 1, 0)).trimEnd()}...`,
      fontSize,
    };
  }

  return {
    text: normalized,
    fontSize,
  };
}
