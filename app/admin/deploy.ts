'use server'

import { exec } from 'child_process';
import { promisify } from 'util';
import { revalidatePath } from 'next/cache';

const execAsync = promisify(exec);

type DeployResult = {
  success: boolean;
  message: string;
  url?: string;
  logs?: string[];
};

export async function deployToVercel(): Promise<DeployResult> {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[Deploy] ${msg}`);
    logs.push(msg);
  };

  // Check if we are running on Vercel (Production)
  // Vercel sets the 'VERCEL' env var to '1'
  if (process.env.VERCEL === '1') {
      try {
          log('Entorno Vercel detectado.');
          log('Sincronizando caché y datos...');
          
          revalidatePath('/', 'layout');
          
          return {
              success: true,
              message: 'Sincronización de datos completada (En producción no se puede recompilar el código fuente, solo actualizar datos).',
              logs
          };
      } catch (error: any) {
          return {
              success: false,
              message: 'Error al sincronizar en producción: ' + error.message,
              logs
          };
      }
  }

  // Local Development Logic
  try {
    log('Iniciando proceso de despliegue optimizado desde Local...');

    // 1. Git Sync
    log('1/4 Sincronizando con Git...');
    try {
        await execAsync('git add .');
        await execAsync('git commit -m "Auto deploy from Admin Dashboard"');
    } catch (e: any) {
        // Ignore empty commit error if nothing changed
        if (!e.message.includes('nothing to commit')) {
            log(`Git warning: ${e.message}`);
        }
    }

    // 2. Local Build (Saves Vercel Credits)
    log('2/4 Construyendo proyecto localmente (Vercel Build)...');
    // We use 'npx vercel build --prod' to generate the .vercel/output folder
    await execAsync('npx vercel build --prod');

    // 3. Deploy Prebuilt (Fast & Free-ish)
    log('3/4 Subiendo archivos a Vercel...');
    const { stdout: deployUrl } = await execAsync('npx vercel deploy --prebuilt --prod');

    // 4. Verification
    const url = deployUrl.trim();
    log(`4/4 ¡Despliegue completado! URL: ${url}`);

    revalidatePath('/');
    
    return {
      success: true,
      message: 'Despliegue exitoso',
      url: url,
      logs
    };

  } catch (error: any) {
    console.error('Deploy Error:', error);
    return {
      success: false,
      message: error.message || 'Error desconocido durante el despliegue',
      logs
    };
  }
}
