const QRService = {
    /**
     * Parse Object into string TLV
     *
     * @param JSONData Object
     * @returns {string}
     */
    toTLV(JSONData) {
        try {
            let qr = '';
            qr += this.add('00', '01');
            qr += this.add('01', '12'); //12 = Dynamic
            qr += this.add('26', this.get26(JSONData));
            qr += this.add('51', this.get51(JSONData));
            qr += this.add('52', JSONData.MCC);
            qr += this.add('53', JSONData.currency);
            qr += this.add('54', JSONData.amount);

            switch (JSONData.withTip) {
                case '00':
                    qr += this.add('55', JSONData.withTip);
                    break;
                case '02':
                    qr += this.add('56', parseFloat(JSONData.tipAmount).toFixed(2));
                    break;
                case '03':
                    qr += this.add('57', JSONData.tipPersen);
                    break;
            }

            qr += this.add('58', JSONData.country);
            qr += this.add('59', JSONData.outletName);
            qr += this.add('60', JSONData.address);
            qr += this.add('61', JSONData.postal);
            qr += this.add('62', this.get62Dinamis(JSONData));
            qr += this.add('63', this.getCRC(qr + '6304'));
            return qr;
        } catch (e) {
            throw new Error(e);
        }
    },
    get26(JSONData) {
        let str26 = '';
        str26 += this.add('00', JSONData.domain);
        str26 += this.add('01', JSONData.MPAN);
        str26 += this.add('02', JSONData.MID);
        str26 += this.add('03', JSONData.kriteria);
        return str26;
    },
    get51(JSONData) {
        let str51 = '';
        str51 += this.add('00', JSONData.domain);
        str51 += this.add('02', JSONData.NMID);
        str51 += this.add('03', JSONData.kriteria);
        return str51;
    },
    get62Dinamis(JSONData) {
        let str62 = '';
        str62 += this.add('01', JSONData.billing);
        str62 += this.add('07', JSONData.terminalID);
        return str62;
    },
    add(tag, data) {
        return tag + this.padding(data, 2) + data;
    },
    padding(data, size) {
        return data.length.toString().padStart(size, '0');
    },

    // CRC16 IBM-3740 Implementation
    getCRC(qr) {
        const crc = this.crc16IBM3740(qr);
        return crc.toString(16).toUpperCase().padStart(4, '0');
    },

    // CRC16 IBM-3740 (polynomial 0x1021, init 0xFFFF)
    crc16IBM3740(str) {
        const bytes = new TextEncoder().encode(str);
        let crc = 0xFFFF;
        for (let b of bytes) {
            crc ^= b << 8;
            for (let i = 0; i < 8; i++) {
                if (crc & 0x8000) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc = crc << 1;
                }
                crc &= 0xFFFF;
            }
        }
        return crc;
    }
};

export default QRService;
