// Public contract of the show plugin: its requests and pushes, shared by backend and frontend.
import { z } from 'zod'
import { defineContract } from '@template/sdk'
import {
  LiveFrameDto,
  MovePresetDto,
  ParamStateChangedDto,
  ParamStateDto,
  PresetIdDto,
  PresetInfoDto,
  SetLinksDto,
  SetParamStateDto,
  SetTransportDto,
  SetupDto,
  ShowNameDto,
  SnapshotDto,
  TransportDto,
  UpdatePresetInfoDto,
} from './show.dto'

export const showContract = defineContract({
  id: 'show',
  requests: {
    getSnapshot: { request: z.undefined(), response: SnapshotDto },

    // Show files
    openShow: { request: ShowNameDto, response: SnapshotDto },
    createShow: { request: ShowNameDto, response: SnapshotDto },
    updateSetup: { request: SetupDto, response: SnapshotDto },

    // Presets (page de gestion des presets)
    recallPreset: { request: PresetIdDto, response: SnapshotDto },
    createPreset: { request: PresetInfoDto, response: SnapshotDto },
    duplicatePreset: { request: PresetIdDto, response: SnapshotDto },
    updatePresetInfo: { request: UpdatePresetInfoDto, response: SnapshotDto },
    movePreset: { request: MovePresetDto, response: SnapshotDto },
    deletePreset: { request: PresetIdDto, response: SnapshotDto },

    // Live editing of the active preset
    setParamState: { request: SetParamStateDto, response: ParamStateDto },
    setLinks: { request: SetLinksDto, response: SnapshotDto },

    setTransport: { request: SetTransportDto, response: TransportDto },
  },
  pushes: {
    /** Structural change (show opened, setup, preset list, recall, links): full GUI state. */
    snapshot: SnapshotDto,
    /** One parameter of a preset was edited (cheaper than a snapshot while dragging a slider). */
    paramStateChanged: ParamStateChangedDto,
    transportChanged: TransportDto,
    /** Throttled live values for the GUI; the backend itself runs at full rate. */
    liveFrame: LiveFrameDto,
  },
})
