export interface IpGeoLocation {
    ip: string;
    countryName: string;
    countryCode: string;
    cityName: string;
    regionName: string;
    isp: string;
    flagEmoji: string;
    isLocal: boolean;
}

const geoCache = new Map<string, IpGeoLocation>();

export function getCountryFlagEmoji(countryCode?: string): string {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

export async function fetchIpGeoLocation(ip: string): Promise<IpGeoLocation> {
    if (!ip || ip === '—') {
        return {
            ip,
            countryName: 'Unknown Location',
            countryCode: '',
            cityName: '',
            regionName: '',
            isp: 'N/A',
            flagEmoji: '🌐',
            isLocal: false,
        };
    }

    const cleanIp = ip.replace(/^::ffff:/, '').trim();

    if (
        cleanIp === '127.0.0.1' ||
        cleanIp === '::1' ||
        cleanIp === 'localhost' ||
        cleanIp.startsWith('192.168.') ||
        cleanIp.startsWith('10.') ||
        cleanIp.startsWith('172.16.')
    ) {
        return {
            ip: cleanIp,
            countryName: 'Local Network',
            countryCode: 'LOCAL',
            cityName: 'Development Environment',
            regionName: 'Internal IP',
            isp: 'Loopback / Private LAN',
            flagEmoji: '💻',
            isLocal: true,
        };
    }

    if (geoCache.has(cleanIp)) {
        return geoCache.get(cleanIp)!;
    }

    try {
        const response = await fetch(`https://freeipapi.com/api/json/${cleanIp}`);
        if (!response.ok) throw new Error('Geo API HTTP error');
        const data = await response.json();

        const result: IpGeoLocation = {
            ip: cleanIp,
            countryName: data.countryName || 'Unknown Country',
            countryCode: data.countryCode || '',
            cityName: data.cityName || '',
            regionName: data.regionName || '',
            isp: data.asnOrganization || data.isp || 'Unknown Network Provider',
            flagEmoji: getCountryFlagEmoji(data.countryCode),
            isLocal: false,
        };

        geoCache.set(cleanIp, result);
        return result;
    } catch {
        // Fallback result on API error
        const fallback: IpGeoLocation = {
            ip: cleanIp,
            countryName: 'Public IP',
            countryCode: '',
            cityName: 'Location Unavailable',
            regionName: '',
            isp: 'External Client',
            flagEmoji: '🌐',
            isLocal: false,
        };
        return fallback;
    }
}
