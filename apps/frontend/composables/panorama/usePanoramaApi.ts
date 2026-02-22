import { useApi } from '../useApi'
import { usePublicApi } from '../usePublicApi'
import type {
  Panorama,
  CreatePanoramaPayload,
  UpdatePanoramaPayload,
  CreateSnapshotPayload,
  UpdateSnapshotPayload,
  CreateBeaconPayload,
  UpdateBeaconPayload,
  PanoramaSnapshot,
  PanoramaBeacon,
} from './types'

export const usePanoramaApi = () => {
  const { fetchApi, uploadApi } = useApi()

  // ── Panorama ─────────────────────────────────────────

  const getPanoramas = (projectId: string): Promise<Panorama[]> =>
    fetchApi(`/projects/${projectId}/panoramas`)

  const createPanorama = (
    projectId: string,
    payload: CreatePanoramaPayload,
  ): Promise<Panorama> =>
    fetchApi(`/projects/${projectId}/panoramas`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

  const getPanorama = (panoramaId: string): Promise<Panorama> =>
    fetchApi(`/panoramas/${panoramaId}`)

  const updatePanorama = (
    panoramaId: string,
    payload: UpdatePanoramaPayload,
  ): Promise<Panorama> =>
    fetchApi(`/panoramas/${panoramaId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

  const deletePanorama = (panoramaId: string): Promise<void> =>
    fetchApi(`/panoramas/${panoramaId}`, { method: 'DELETE' })

  // ── Snapshots ────────────────────────────────────────

  const uploadSnapshotImage = async (
    projectId: string,
    panoramaId: string,
    file: File,
  ): Promise<{ imageUrl: string }> => {
    const form = new FormData()
    form.append('file', file)
    return uploadApi(
      `/projects/${projectId}/panoramas/${panoramaId}/upload-image`,
      form,
    )
  }

  const uploadImplantation = async (
    projectId: string,
    panoramaId: string,
    file: File,
  ): Promise<{ implantationUrl: string }> => {
    const form = new FormData()
    form.append('file', file)
    return uploadApi(
      `/projects/${projectId}/panoramas/${panoramaId}/upload-implantation`,
      form,
    )
  }

  const createSnapshot = (
    panoramaId: string,
    payload: CreateSnapshotPayload,
  ): Promise<PanoramaSnapshot> =>
    fetchApi(`/panoramas/${panoramaId}/snapshots`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

  const updateSnapshot = (
    snapshotId: string,
    payload: UpdateSnapshotPayload,
  ): Promise<PanoramaSnapshot> =>
    fetchApi(`/panorama-snapshots/${snapshotId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

  const deleteSnapshot = (snapshotId: string): Promise<void> =>
    fetchApi(`/panorama-snapshots/${snapshotId}`, { method: 'DELETE' })

  // ── Beacons ──────────────────────────────────────────

  const createBeacon = (
    panoramaId: string,
    payload: CreateBeaconPayload,
  ): Promise<PanoramaBeacon> =>
    fetchApi(`/panoramas/${panoramaId}/beacons`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

  const updateBeacon = (
    beaconId: string,
    payload: UpdateBeaconPayload,
  ): Promise<PanoramaBeacon> =>
    fetchApi(`/panorama-beacons/${beaconId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

  const deleteBeacon = (beaconId: string): Promise<void> =>
    fetchApi(`/panorama-beacons/${beaconId}`, { method: 'DELETE' })

  return {
    getPanoramas,
    createPanorama,
    getPanorama,
    updatePanorama,
    deletePanorama,
    uploadSnapshotImage,
    uploadImplantation,
    createSnapshot,
    updateSnapshot,
    deleteSnapshot,
    createBeacon,
    updateBeacon,
    deleteBeacon,
  }
}

export const usePublicPanorama = () => {
  const { fetchPublic } = usePublicApi()

  const getPublicPanoramas = (projectId: string): Promise<Panorama[]> =>
    fetchPublic(`/p/projects/${projectId}/panoramas`)

  return { getPublicPanoramas }
}
