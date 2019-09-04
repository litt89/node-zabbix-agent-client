(function (module) {

    const net = require('net');

    function ZabbixAgentClient(port, host) {
        let self = this;

        self.getConnection = function (callback) {
            let connection = net.createConnection(port, host, function () {
                callback(undefined, connection);
            });
        };
    }

    const prepareData = data => {
        const ZBXD_HEADER = new Buffer.from("ZBXD\1");
        const payload = new Buffer.from(data, "utf8");
        const size = new Buffer.alloc(4);
        size.writeInt32LE(payload.length, 0);
        return Buffer.concat([ZBXD_HEADER, size, new Buffer.from("\0\0\0\0"), payload]);
      };
      

    ZabbixAgentClient.prototype.getItemByFullName = function (item, callback) {
        this.getConnection(function (error, connection) {
            let fulldata = '';

            if (error) {
                return callback(error);
            }

            connection.on('data', function (data) {
                let header,
                    check,
                    length;

                if (data.length < (4 + 1 + 8 + 1)) {
                    return callback(new Error('Incorrect response size'));
                }

                header = data.slice(0, 4).toString();
                check = data[4];
                if ((header != 'ZBXD' && header != 'ZBXDS' && header != 'G') || (data[4] != 0x01 && data[4] != 0)) {
                    // return callback(new Error('Incorrect header: ' + header + ':' + check));
                }

                length = data.readUInt32LE(5);
                if (data.length != (4 + 1 + 8 + length)) {
                    fulldata = fulldata + data;
                } else {
                    fulldata = data;
                }

            }).on('end', () => {
                return callback(undefined, fulldata.slice(13).toString());
            });

            connection.write(prepareData(item));
        });
    };

    ZabbixAgentClient.prototype.getItemWithParams = function (item, params, callback) {
        if (params && params.length) {
            item = item + '[' + params.join(',') + ']';
        }

        return this.getItemByFullName(item, callback);
    };

    module.exports = ZabbixAgentClient;

})(module);
