import React, { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Icon, Icons } from "@/components/Icon";
import { useLoading } from "@/hooks/useLoading";
import { MWMediaType, MWSeasonWithEpisodeMeta } from "@/backend/metadata/types";
import { getMetaFromId } from "@/backend/metadata/getmeta";
import { decodeJWId } from "@/backend/metadata/justwatch";
import { Loading } from "@/components/layout/Loading";
import { IconPatch } from "@/components/buttons/IconPatch";
import { useVideoPlayerDescriptor } from "@/video/state/hooks";
import { useMeta } from "@/video/state/logic/meta";
import { useControls } from "@/video/state/logic/controls";
import { useWatchedContext } from "@/state/watched";
import { useTranslation } from "react-i18next";
import { PopoutListEntry, PopoutSection } from "./PopoutUtils";

export function EpisodeSelectionPopout() {
  const params = useParams<{
    media: string;
  }>();
  const { t } = useTranslation();

  const descriptor = useVideoPlayerDescriptor();
  const meta = useMeta(descriptor);
  const controls = useControls(descriptor);

  const [isPickingSeason, setIsPickingSeason] = useState<boolean>(false);
  const [currentVisibleSeason, setCurrentVisibleSeason] = useState<{
    seasonId: string;
    season?: MWSeasonWithEpisodeMeta;
  } | null>(null);
  const [reqSeasonMeta, loading, error] = useLoading(
    (id: string, seasonId: string) => {
      return getMetaFromId(MWMediaType.SERIES, id, seasonId);
    }
  );
  const requestSeason = useCallback(
    (sId: string) => {
      setCurrentVisibleSeason({
        seasonId: sId,
        season: undefined,
      });
      setIsPickingSeason(false);
      reqSeasonMeta(decodeJWId(params.media)?.id as string, sId).then((v) => {
        if (v?.meta.type !== MWMediaType.SERIES) return;
        setCurrentVisibleSeason({
          seasonId: sId,
          season: v?.meta.seasonData,
        });
      });
    },
    [reqSeasonMeta, params.media]
  );

  const currentSeasonId =
    currentVisibleSeason?.seasonId ?? meta?.episode?.seasonId;

  const setCurrent = useCallback(
    (seasonId: string, episodeId: string) => {
      controls.closePopout();
      // race condition, jank solution but it works.
      setTimeout(() => {
        controls.setCurrentEpisode(seasonId, episodeId);
      }, 100);
    },
    [controls]
  );

  const currentSeasonInfo = useMemo(() => {
    return meta?.seasons?.find((season) => season.id === currentSeasonId);
  }, [meta, currentSeasonId]);

  const currentSeasonEpisodes = useMemo(() => {
    if (currentVisibleSeason?.season) {
      return currentVisibleSeason?.season?.episodes;
    }
    return meta?.seasons?.find?.(
      (season) => season && season.id === currentSeasonId
    )?.episodes;
  }, [meta, currentSeasonId, currentVisibleSeason]);

  const toggleIsPickingSeason = () => {
    setIsPickingSeason(!isPickingSeason);
  };

  const setSeason = (id: string) => {
    requestSeason(id);
    setCurrentVisibleSeason({ seasonId: id });
  };

  const { watched } = useWatchedContext();

  const titlePositionClass = useMemo(() => {
    const offset = isPickingSeason ? "left-0" : "left-10";
    return [
      "absolute w-full transition-[left,opacity] duration-200",
      offset,
    ].join(" ");
  }, [isPickingSeason]);

  return (
    <>
      <PopoutSection className="bg-ash-100 font-bold text-white">
        <div className="relative flex items-center">
          <button
            className={[
              "-m-1.5 rounded-lg p-1.5 transition-opacity duration-100 hover:bg-ash-200",
              isPickingSeason ? "pointer-events-none opacity-0" : "opacity-1",
            ].join(" ")}
            onClick={toggleIsPickingSeason}
            type="button"
          >
            <Icon icon={Icons.CHEVRON_LEFT} />
          </button>
          <span
            className={[
              titlePositionClass,
              !isPickingSeason ? "opacity-1" : "opacity-0",
            ].join(" ")}
          >
            {currentSeasonInfo?.title || ""}
          </span>
          <span
            className={[
              titlePositionClass,
              isPickingSeason ? "opacity-1" : "opacity-0",
            ].join(" ")}
          >
            {t("videoPlayer.popouts.seasons")}
          </span>
        </div>
      </PopoutSection>
      <div className="relative grid h-full grid-rows-[minmax(1px,1fr)]">
        <PopoutSection
          className={[
            "absolute inset-0 z-30 overflow-y-auto border-ash-400 bg-ash-100 transition-[max-height,padding] duration-200",
            isPickingSeason
              ? "max-h-full border-t"
              : "max-h-0 overflow-hidden py-0",
          ].join(" ")}
        >
          {currentSeasonInfo
            ? meta?.seasons?.map?.((season) => (
                <PopoutListEntry
                  key={season.id}
                  active={meta?.episode?.seasonId === season.id}
                  onClick={() => setSeason(season.id)}
                  isOnDarkBackground
                >
                  {season.title}
                </PopoutListEntry>
              ))
            : "No season"}
        </PopoutSection>
        <PopoutSection className="relative h-full overflow-y-auto">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center">
              <Loading />
            </div>
          ) : error ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col flex-wrap items-center text-slate-400">
                <IconPatch
                  icon={Icons.EYE_SLASH}
                  className="text-xl text-bink-600"
                />
                <p className="mt-6 w-full text-center">
                  {t("videoPLayer.popouts.errors.loadingWentWrong", {
                    seasonTitle: currentSeasonInfo?.title?.toLowerCase(),
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div>
              {currentSeasonEpisodes && currentSeasonInfo
                ? currentSeasonEpisodes.map((e) => (
                    <PopoutListEntry
                      key={e.id}
                      active={e.id === meta?.episode?.episodeId}
                      onClick={() => {
                        if (e.id === meta?.episode?.episodeId)
                          controls.closePopout();
                        else setCurrent(currentSeasonInfo.id, e.id);
                      }}
                      percentageCompleted={
                        watched.items.find(
                          (item) =>
                            item.item?.series?.seasonId ===
                              currentSeasonInfo.id &&
                            item.item?.series?.episodeId === e.id
                        )?.percentage
                      }
                    >
                      {t("videoPlayer.popouts.episode", {
                        index: e.number,
                        title: e.title,
                      })}
                    </PopoutListEntry>
                  ))
                : "No episodes"}
            </div>
          )}
        </PopoutSection>
      </div>
    </>
  );
}
