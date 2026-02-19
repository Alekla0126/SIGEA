import { CurrentArea, ModuleOwner, PrismaClient, RecordStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

const defaultPassword = "Sigea123!";

const users = [
  { name: "Operador Flagrancia", email: "flagrancia@sigea.local", role: Role.FLAGRANCIA },
  { name: "Ministerio Publico", email: "mp@sigea.local", role: Role.MP },
  { name: "Operador Litigacion", email: "litigacion@sigea.local", role: Role.LITIGACION },
  { name: "Supervisor SIGEA", email: "supervisor@sigea.local", role: Role.SUPERVISOR },
  { name: "Administrador SIGEA", email: "admin@sigea.local", role: Role.ADMIN },
];

const samplePayload = {
  agencyName: "FISCALIA DE INVESTIGACION METROPOLITANA",
  reportTitle: "REPORTE DE PARTICIPACION MINISTERIAL EN AUDIENCIA JUDICIAL",
  templateVersion: "v1",
  expedientes: {
    cdi: "CDI-001",
    cp: "CP-001",
    carpetaJudicial: "CJ-2026-01",
    juicioOral: "JO-001",
  },
  fechaHora: {
    fecha: "13 DE FEBRERO DE 2026",
    horaProgramada: "HORA PROGRAMADA: 09:00",
    horaInicio: "09:10",
    horaTermino: "10:00",
  },
  delito: {
    nombre: "ROBO CALIFICADO",
  },
  imputado: {
    nombreCompleto: "JUAN PEREZ RAMIREZ",
  },
  ofendido: {
    nombreCompleto: "MARIA LOPEZ RUIZ",
  },
  hecho: {
    descripcion:
      "Se celebro audiencia inicial y se expuso el hecho imputado conforme a la carpeta de investigacion con lectura de derechos.",
  },
  audiencia: {
    tipo: "CONTROL DE DETENCION",
    etapa: "PROCEDIMIENTO INICIAL",
    modalidad: "PRESENCIAL",
  },
  autoridades: {
    juez: "LIC. JUEZ DE CONTROL 1",
    mp: "LIC. MP ADSCRITO",
    defensa: "DEFENSOR PUBLICO",
    asesorJuridico: "ASESOR VICTIMAL",
    observacion: "Sin incidencias procesales",
  },
  resultado: {
    descripcion: "Se califico de legal la detencion y se fijo audiencia de vinculacion.",
  },
  medidaCautelar: {
    descripcion: "PRESENTACION PERIODICA",
    tipo: "NO PRIVATIVA",
    fundamento: "Criterio judicial en audiencia",
  },
  observaciones: {
    texto: "Caso de seguimiento prioritario.",
    relevancia: "BAJA",
    violenciaGenero: false,
  },
};

async function main() {
  const passwordHash = await bcrypt.hash(defaultPassword, 12);
  const createdUsers = [] as Array<{ id: string; role: Role }>;

  for (const user of users) {
    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        isActive: true,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
      },
      select: {
        id: true,
        role: true,
      },
    });

    createdUsers.push(upserted);
  }

  const flagrancia = createdUsers.find((user) => user.role === Role.FLAGRANCIA);
  const admin = createdUsers.find((user) => user.role === Role.ADMIN);
  if (!flagrancia) {
    throw new Error("No se pudo crear usuario de flagrancia");
  }
  if (!admin) {
    throw new Error("No se pudo crear usuario admin");
  }

  const caseFolio = "SIGEA-2026-0001";
  const existingCase = await prisma.case.findUnique({ where: { folio: caseFolio } });

  const oneCase =
    existingCase ??
    (await prisma.case.create({
      data: {
        folio: caseFolio,
        title: "Audiencia inicial de control",
        description: "Caso semilla para pruebas de flujo SIGEA",
        createdById: flagrancia.id,
      },
    }));

  const existingRecord = await prisma.record.findFirst({ where: { caseId: oneCase.id } });

  const seedRecord =
    existingRecord ??
    (await prisma.record.create({
      data: {
        caseId: oneCase.id,
        payload: samplePayload,
        moduleOwner: ModuleOwner.FLAGRANCIA,
        currentArea: CurrentArea.FLAGRANCIA,
        status: RecordStatus.READY,
        version: 1,
        createdById: flagrancia.id,
        lastEditedById: flagrancia.id,
        lastEditedAt: new Date(),
      },
    }));

  // Agrega evidencia imagen demo para probar la mampara (foto se toma de la evidencia imagen mas reciente).
  const existingImageEvidence = await prisma.evidence.findFirst({
    where: {
      recordId: seedRecord.id,
      contentType: { in: ["image/png", "image/jpeg", "image/jpg", "image/webp"] },
    },
  });

  if (!existingImageEvidence) {
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./storage/evidence");
    const sourcePhoto = path.resolve("assets/demo/sample-photo.png");
    const filename = `seed-${seedRecord.id}-photo.png`;
    const destPath = path.join(uploadDir, filename);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.copyFile(sourcePhoto, destPath);
    const stat = await fs.stat(destPath);

    await prisma.evidence.create({
      data: {
        recordId: seedRecord.id,
        filename,
        originalName: "foto-mampara-demo.png",
        contentType: "image/png",
        sizeBytes: stat.size,
        storagePath: destPath,
        uploadedById: flagrancia.id,
      },
    });
  }

  await prisma.catalogItem.upsert({
    where: {
      category_code: {
        category: "AUDIENCIA_TIPO",
        code: "CONTROL_DETENCION",
      },
    },
    update: {
      label: "CONTROL DE DETENCION",
      isActive: true,
    },
    create: {
      category: "AUDIENCIA_TIPO",
      code: "CONTROL_DETENCION",
      label: "CONTROL DE DETENCION",
      isActive: true,
      createdById: admin.id,
    },
  });

  const medidasCautelares = [
    { code: "NO_APLICA", label: "NO APLICA" },
    { code: "I_PRESENTACION_PERIODICA", label: "I. La presentación periódica ante el juez o ante autoridad distinta que aquél designe" },
    { code: "II_GARANTIA_ECONOMICA", label: "II. La exhibición de una garantía económica" },
    { code: "III_EMBARGO_BIENES", label: "III. El embargo de bienes" },
    { code: "IV_INMOVILIZACION_CUENTAS", label: "IV. La inmovilización de cuentas y demás valores que se encuentren dentro del sistema financiero" },
    { code: "V_PROHIBICION_SALIR_AMBITO", label: "V. La prohibición de salir sin autorización del país, de la localidad en la cual reside o del ámbito territorial que fije el juez" },
    { code: "VI_CUIDADO_VIGILANCIA", label: "VI. El sometimiento al cuidado o vigilancia de una persona o institución determinada o internamiento a institución determinada" },
    { code: "VII_NO_CONCURRIR_LUGARES", label: "VII. La prohibición de concurrir a determinadas reuniones o acercarse a ciertos lugares" },
    { code: "VIII_NO_ACERCARSE_PERSONAS", label: "VIII. La prohibición de convivir, acercarse o comunicarse con determinadas personas, con las víctimas u ofendidos o testigos, siempre que no se afecte el derecho de defensa" },
    { code: "IX_SEPARACION_DOMICILIO", label: "IX. La separación inmediata del domicilio" },
    { code: "X_SUSPENSION_CARGO", label: "X. La suspensión temporal en el ejercicio del cargo cuando se le atribuye un delito cometido por servidores públicos" },
    { code: "XI_SUSPENSION_ACTIVIDAD", label: "XI. La suspensión temporal en el ejercicio de una determinada actividad profesional o laboral" },
    { code: "XII_LOCALIZADORES_ELECTRONICOS", label: "XII. La colocación de localizadores electrónicos" },
    { code: "XIII_RESGUARDO_DOMICILIO", label: "XIII. El resguardo en su propio domicilio con las modalidades que el juez disponga" },
    { code: "XIV_PRISION_PREVENTIVA_OFICIOSA", label: "XIV. La prisión preventiva (oficiosa)" },
    { code: "XIV_PRISION_PREVENTIVA_JUSTIFICADA", label: "XIV. La prisión preventiva (justificada)" },
  ] as const;

  for (const item of medidasCautelares) {
    await prisma.catalogItem.upsert({
      where: {
        category_code: {
          category: "MEDIDA_CAUTELAR",
          code: item.code,
        },
      },
      update: {
        label: item.label,
        isActive: true,
      },
      create: {
        category: "MEDIDA_CAUTELAR",
        code: item.code,
        label: item.label,
        isActive: true,
        createdById: admin.id,
      },
    });
  }

  const jueces = [
    "Hugo Alejandro Teutli Cruz",
    "Martín José Calihua Martínez",
    "Juan Gonzólez Bello",
    "Jaime Arroyo Razo",
    "Elizabeth Morales Sierra",
    "Jesús Palma Zenteno",
    "Helmo Mayoral Bello",
    "Ana Karen González Arenas",
    "Juan Marcelino Romero de Jesús",
    "Maria Socorro López Reyes",
    "Imelda Martínez Moxca",
    "José Alejandro Ramirez Cante",
    "Marco Antonio Mendoza Benítez",
    "Enrique Romero Razo",
    "Maria Rosalba Pantoja Vázquez",
    "Marco Antonio Gabriel González Alegría",
    "Griselda Méndez Ibarra",
    "José Luis Arenas Juárez",
    "José Cuautemoc Blázquez Guevara",
    "Verónica Rojas Pasán",
    "Miriam Morales botello",
    "Maria del Rosario Sánhez Aguilera",
    "Adolfo Hernández Martínez",
    "Magda Reyes Delgado",
    "Edna Vázquez Pérez",
    "Cristina Pérez Terán",
    "Maria Guadalupe Ramos Cruz",
    "Génesis Estephani Sánchez Hernández",
    "Gabriela Alvarado León",
    "Antonia Ines Morales Palacios",
    "Luz María Perea Perea Iturriaga",
    "Alberto Gutiérrez Ríos",
    "Aurora Emelia Velázquez",
    "Ernesto Abraham Enriquez Durán",
    "Lisheidy Zepeda González",
    "Luis Sánchez Vázquez",
    "José Nicolás Severiano Sánchez",
    "Idalia Arciniega Arias",
    "Fernando Martínez Espinoza",
    "Renato Rojas Hidalgo",
    "Liszet del Carmen Fuentes Trueba",
    "Karla Ivonne Munguia Olmas",
    "Miguel Angel Martín Hernández",
    "Karla Patricia Ambrocio Vargas",
    "Luis Fernando Cornejo Huesca",
    "Daniela Victoria Ramírez Palma",
    "Sergio Tecpanecatl Cuautle",
    "José Hugo Salvador González Jiménez",
    "José Alvaro Samiento Marquez",
    "Julio César Ortíz Castro",
    "Martha Liliana Farrera Bello",
    "José Luis Campillo González",
    "Maria Alejandra Aguilar Anacleto",
    "Arturo Barranco Montoya",
    "Lucio Leon Mata",
    "Alberto Zenteno Reyes",
    "Francisco Javier Martínez Castillo",
    "Kenia Salgado Covarrubias",
  ] as const;

  for (const [index, label] of jueces.entries()) {
    const code = `JUEZ_${String(index + 1).padStart(3, "0")}`;
    await prisma.catalogItem.upsert({
      where: {
        category_code: {
          category: "JUEZ",
          code,
        },
      },
      update: {
        label,
        isActive: true,
      },
      create: {
        category: "JUEZ",
        code,
        label,
        isActive: true,
        createdById: admin.id,
      },
    });
  }

  const delitos = [
    "Rebelión",
    "Sedición",
    "Motín",
    "Terrorismo",
    "Conspiración",
    "Quebrantamiento de sanción",
    "Armas e instrumento prohibido",
    "Delincuencia organizada",
    "Asociación delictuosa y pandillerismo",
    "Ataques a las vías de comunicación y a la seguridad en los medios de transporte",
    "Violación de correspondencia",
    "Delitos contra el medio ambiente",
    "Delitos contra la infraestructura hidráulica",
    "Incendio y otros estragos",
    "Venta ilícita de bebidas alcohólicas",
    "Desobediencia y resistencia de particulares",
    "Oposición a que se ejecute alguna obra o trabajo público",
    "Quebrantamiento de sellos",
    "Delitos cometidos contra funcionarios públicos",
    "Encubrimiento",
    "Encubrimiento por receptación",
    "Responsabilidad de abogados patronos y litigantes",
    "Responsabilidad médica",
    "Responsabilidad técnica",
    "Responsabilidad notarial",
    "Falsificación de acciones, obligaciones y otros documentos de crédito público",
    "Falsificación de sellos, marcas y punzones",
    "Falsificación de documentos en general",
    "Falsedad de declaraciones e informes dados a una autoridad",
    "Ocultación o variación de nombre o domicilio",
    "Usurpación de funciones públicas o de profesión y uso indebido de uniformes o condecoraciones",
    "Amenazas",
    "Allanamiento de morada",
    "Asalto y atraco",
    "Privación ilegal de la libertad",
    "Plagio o secuestro",
    "Desaparición forzada",
    "Violencia en eventos deportivos o de espectáculo",
    "Lesiones dolosas",
    "Inducción y auxilio al suicidio",
    "Homicidio",
    "Homicidio tumultuario",
    "Feminicidio",
    "Aborto",
    "Ataques peligrosos",
    "Abandono de personas",
    "Incumplimiento de obligación alimentaria",
    "Abuso de confianza",
    "Fraude",
    "Despojo",
    "Daño en propiedad ajena",
    "Robo de ganado",
    "Robo a casa habitación",
    "Robo a transeúnte",
    "Robo en transporte público",
    "Robo en transporte privado",
    "Robo a cuentahabiente",
    "Robo a cuentahabiente e instituciones bancarias",
    "Robo a comercio",
    "Robo de maquinaria",
    "Robo de equipo agrícola",
    "Narcomenudeo",
    "Robo de vehículos",
    "Robo de vehículos con mercancía",
    "Robo de autopartes",
    "Delito diverso (captura manual)",
  ] as const;

  for (const [index, label] of delitos.entries()) {
    const code = `DELITO_${String(index + 1).padStart(3, "0")}`;
    await prisma.catalogItem.upsert({
      where: {
        category_code: {
          category: "DELITO",
          code,
        },
      },
      update: {
        label,
        isActive: true,
      },
      create: {
        category: "DELITO",
        code,
        label,
        isActive: true,
        createdById: admin.id,
      },
    });
  }

  console.log("Seed completado.");
  console.log(`Usuarios demo password: ${defaultPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
