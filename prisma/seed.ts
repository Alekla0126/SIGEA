import { CurrentArea, ModuleOwner, PrismaClient, RecordStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

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
    relevancia: "MEDIA",
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

  if (!existingRecord) {
    await prisma.record.create({
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
