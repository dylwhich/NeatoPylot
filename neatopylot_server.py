#!/usr/bin/env python
'''
neatopylot_server.py - server code for Neato XV-11 Autopylot 

Copyright (C) 2013 Suraj Bajracharya and Simon D. Levy

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as 
published by the Free Software Foundation, either version 3 of the 
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.


Revision history:


22-FEB-2013 Simon D. Levy   Initial release

09-SEP-2014 SDL             Migrated to github

'''

import serial
from serial_asyncio import *
from aiohttp import web, WSMsgType
import asyncio
import time
import sys


clients = []
connection = None


class Output(asyncio.Protocol):
    def connection_made(self, transport):
        global connection
        self.transport = transport
        connection = transport

    def data_received(self, data):
        print(data)
        for ws in clients:
            res = ws.send_str(data.decode('ascii'))

    def connection_lost(self, exc):
        global connection
        self.transport.close()
        connection = None

    def pause_writing(self):
        pass

    def resume_writing(self):
        pass


async def handle_websocket(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    clients.append(ws)

    try:
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                connection.write(msg.data.encode('ascii') + b'\n')
            elif msg.type == WSMsgType.CLOSE or msg.type == WSMsgType.CLOSED or msg.type == WSMsgType.ERROR:
                clients.remove(ws)
    finally:
        clients.remove(ws)

    await ws.close()

    return ws


async def index(request):
    with open('index.html') as f:
        return web.Response(text=f.read(), content_type="text/html")


def main(device="/dev/ttyACM0", port="20000", listen="::", *_):
    global connection
    if _:
        raise ValueError("Too many things!!!")

    try:
        connection = create_serial_connection(
            asyncio.get_event_loop(), Output,
            device, 115200, serial.EIGHTBITS,
            serial.PARITY_NONE, serial.STOPBITS_ONE, .1
        )
    except serial.SerialException:
        print("Unable to connect to XV-11 on {}".format(device))
        print("Please make sure it is powered on and USB is connected")
        sys.exit(1)

    app = web.Application(loop=asyncio.get_event_loop())
    app.router.add_get('/', index)
    app.router.add_static('/static', 'static')
    app.router.add_get('/control', handle_websocket)

    app_server = asyncio.get_event_loop().create_server(app.make_handler(), listen, port)
    asyncio.get_event_loop().run_until_complete(asyncio.gather(app_server, connection))
    asyncio.get_event_loop().run_forever()

    print("Huh... this probably shouldn't happen")


if __name__ == "__main__":
    main(*sys.argv[1:])

# Put the XV-11 into test mode
#    docommand(robot, 'TestMode on')
# Spin up the LIDAR
#    docommand(robot, 'SetLDSRotation on')
    
#else:
#    print('No robot connected; running in test mode')
    

# Keep accepting connections on socket
while False:
    
    # Serve a socket on the host and port specified on the command line

    sock = None   
    
    while True:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    
        try:
            sock.bind((HOST, PORT))
            break
        
        except socket.error as err:
            print('Bind failed: ' + str(err))
        
        time.sleep(1)
        
    sock.listen(1) 

    # Accept a connection from a client
    print('Waiting for client to connect ...')
    try:
        client, address = sock.accept()
        print('Accepted connection')
    except:
        break
       
    # Handle client requests till quit
    while True:
    
        try:
    
            # Get message from client
            msg = client.recv(MESSAGE_SIZE_BYTES)
            
            # Strip trailing whitespace
            msg = msg.rstrip() 
            
            if  not len(msg):
                print('Client quit')
                break
                                
            if msg[0] ==  's':
                        
                scandata = None
            
                # Robot sends scaled LSD sensor values scaled to (0,1)
                if robot:
                
                    # Run scan command
                    docommand(robot, 'GetLDSScan')
                            
                    # Grab scan results till CTRL-Z
                    scandata = robot.read(MAX_SCANDATA_BYTES)
                                
                # Stubbed version sends constant distances
                else:
                    scandata = ''
                    for k in range(360):
                        scandata = scandata + str(k) + ',1500,100,0\n'
                    
                # Send scan results to client
                client.send(scandata)
            
            elif msg[0] == 'm':
                        
                command = 'SetMotor' + msg[1:]    
                                    
                if robot:
                    docommand(robot, command)
                
                else:
                    print(command) 
                            
        except ValueError as ex:
            break
                
    # Done talking to client
    client.close()

# Shut down the XV-11
    
if False:

    print('Shutting down ...')
    
    # Spin down the LIDAR
    docommand(robot, 'SetLDSRotation off')
    
    # Take the XV-11 out of test mode
    docommand(robot, 'TestMode off')
    
    # Close the port
    robot.close()   
    
    # Wait a second while the LIDAR spins down
    time.sleep(1)


