# ARG GO_VERSION=1.20.5
# FROM golang:$GO_VERSION as build

# # install the algorand binaries
# WORKDIR /node
# RUN set -xe; \
#   mkdir bin; \
#   mkdir data; \
#   wget https://raw.githubusercontent.com/algorand/go-algorand/rel/stable/cmd/updater/update.sh; \
#   chmod 744 update.sh; \
#   ./update.sh -i -c stable -p /node/bin -d /node/data -n

# # copy binaries to a fresh image
# FROM alpine:3.16
# COPY --from=build /node/bin/algod /bin/algod
# COPY --from=build /node/bin/goal /bin/goal

# WORKDIR /var/lib/algorand
# ENV ALGORAND_DATA=/var/lib/algorand
# COPY --from=build /node/data/genesis.json /var/lib/algorand/genesis.json

# COPY ./run.sh /var/lib/algorand/run.sh
# RUN set -xe; \
#   chmod 744 /var/lib/algorand/run.sh
# ENTRYPOINT ["/var/lib/algorand/run.sh"]

FROM algorand/algod:latest as build

ENV NETWORK=mainnet

COPY ./config.json /etc/algorand/config.json