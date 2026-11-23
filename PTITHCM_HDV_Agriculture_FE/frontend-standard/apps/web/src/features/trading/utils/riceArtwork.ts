import riceDaiThom from '../../../workspace/assets/rice_dai_thom.svg';
import riceIr50404 from '../../../workspace/assets/rice_ir50404.svg';
import riceJasmine from '../../../workspace/assets/rice_jasmine.svg';
import riceOm18 from '../../../workspace/assets/rice_om18.svg';
import riceSt25 from '../../../workspace/assets/rice_st25.svg';

export function getRiceArtwork(seedType: string): { src: string; label: string } {
  const normalized = seedType.toLowerCase();
  if (normalized.includes('st25') || normalized.includes('st 25')) {
    return { src: riceSt25, label: 'Minh họa giống lúa ST25' };
  }
  if (normalized.includes('om18') || normalized.includes('om 18')) {
    return { src: riceOm18, label: 'Minh họa giống lúa OM18' };
  }
  if (normalized.includes('jasmine')) {
    return { src: riceJasmine, label: 'Minh họa giống lúa Jasmine 85' };
  }
  if (normalized.includes('thơm') || normalized.includes('thom') || normalized.includes('đt8')) {
    return { src: riceDaiThom, label: 'Minh họa giống lúa Đài Thơm 8' };
  }
  if (normalized.includes('504') || normalized.includes('ir')) {
    return { src: riceIr50404, label: 'Minh họa giống lúa IR50404' };
  }
  return { src: riceSt25, label: 'Minh họa giống lúa ST25' };
}
