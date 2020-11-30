FROM node:14-alpine
# Create app directory
WORKDIR /usr/src/app
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
RUN npm install
# If you are building your code for production
# RUN npm ci --only=production
# Bundle app source
COPY . .

# assign the $env-vars arg to the ENV-VRS so that it can be accessed
# by the subsequent RUN call within the container
ENV VPN_USERNAME $VPN_USERNAME
ENV VPN_PASSWORD $VPN_PASSWORD

# VPN
RUN apt-get update
RUN apt-get install -y sudo

RUN adduser --disabled-password --gecos '' docker
RUN adduser docker sudo
RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

USER docker

RUN sudo apt-get update

RUN sudo apt-get install unzip
RUN sudo wget http://speedtest.dal05.softlayer.com/array/ArrayNetworksL3VPN_LINUX.zip
RUN sudo unzip ArrayNetworksL3VPN_LINUX.zip

RUN sudo chown -v root array_vpnc
RUN sudo chown -v root vpn_cmdline
RUN sudo chmod -v 4755 array_vpnc
RUN sudo chmod -v 4755 vpn_cmdline

RUN sudo ./array_vpnc -hostname vpn.sjc03.softlayer.com -username $VPN_USERNAME -passwd $VPN_PASSWORD &


# Expose and run service
EXPOSE 6005
CMD [ "node", "app.js" ]