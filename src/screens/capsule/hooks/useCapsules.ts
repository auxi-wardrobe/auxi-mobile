import { useQuery } from '@tanstack/react-query';
import { capsuleKeys, capsuleService } from '../../../services/capsuleService';
import { sortCapsulesNewestFirst } from '../capsule-format';

/** List of the user's capsules (summaries), newest first. */
export const useCapsules = () =>
  useQuery({
    queryKey: capsuleKeys.list(),
    queryFn: capsuleService.listCapsules,
    select: sortCapsulesNewestFirst,
  });

/** Full detail for a single capsule. Disabled until an id is available. */
export const useCapsule = (id: string | undefined) =>
  useQuery({
    queryKey: capsuleKeys.detail(id ?? ''),
    queryFn: () => capsuleService.getCapsule(id as string),
    enabled: !!id,
  });
