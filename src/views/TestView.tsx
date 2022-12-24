import { useState, useEffect, useRef } from "react";
import { IconButton } from "@/components/buttons/IconButton";
import { Icons } from "@/components/Icon";
import { Title } from "@/components/text/Title";

class PeerConnection {
  _peerConn: RTCPeerConnection | null = null;
  _channel: RTCDataChannel | null = null;
  _msgCb: ((txt: string) => void) | null = null;

  _initDataChannel() {
    if (this._channel) {
      this._channel.onopen = () => {
        console.log("DATA channel opened");
      };
      this._channel.onmessage = (msg) => {
        console.log("DATA channel message:", msg.data);
        if (this._msgCb) this._msgCb(msg.data);
      };
    }
  }

  _createConnection() {
    let peerConn: RTCPeerConnection;
    const configuration = {
      iceServers: [
        {
          urls: "stun:stun.gmx.net",
        },
      ],
    };
    try {
      peerConn = new RTCPeerConnection(configuration);
    } catch (err) {
      throw new Error("PEER connection failed");
    }
    peerConn.onicecandidate = (evt) => {
      if (evt.candidate !== null) {
        console.log("ICE candidate found");
        return;
      }
      console.log("ICE candidate received (LAST)", peerConn.localDescription);
    };
    peerConn.onconnectionstatechange = (evt) => {
      console.log("PEER connection state changed", evt);
    };
    peerConn.oniceconnectionstatechange = (evt) => {
      console.log("ICE connection state changed", evt);
    };
    peerConn.ondatachannel = (evt) => {
      console.log("DATA channel created");
      this._channel = evt.channel;
      this._initDataChannel();
    };
    this._peerConn = peerConn;
  }

  async createOffer(): Promise<string> {
    this._createConnection();
    this._channel = this._peerConn?.createDataChannel("test") ?? null;
    this._initDataChannel();
    if (!this._peerConn) throw new Error("failed create peer conn");
    const offer = await this._peerConn.createOffer();
    await this._peerConn.setLocalDescription(offer);
    return JSON.stringify(offer);
  }

  async respondToAnswer(answer: string) {
    if (!this._peerConn) throw new Error("failed create peer conn");
    await this._peerConn.setRemoteDescription(JSON.parse(answer));
  }

  async connectToOffer(offer: string): Promise<string> {
    this._createConnection();
    if (!this._peerConn) throw new Error("failed create peer conn");
    await this._peerConn.setRemoteDescription(JSON.parse(offer));
    const answer = await this._peerConn.createAnswer();
    await this._peerConn.setLocalDescription(answer);
    return JSON.stringify(answer);
  }

  onMessage(handler: (txt: string) => void) {
    this._msgCb = handler;
  }

  sendMessage(txt: string) {
    if (this._channel) this._channel.send(txt);
  }
}

function HostView() {
  const [offer, setOffer] = useState("");
  const [answer, setAnswer] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const conn = useRef(new PeerConnection());

  useEffect(() => {
    (async () => {
      conn.current.onMessage((txt) => {
        setLogs((arr) => [...arr, txt]);
      });
      const txtOffer = await conn.current.createOffer();
      setOffer(txtOffer);
    })();
  }, []);

  async function respondAnswer(answerText: string) {
    conn.current.respondToAnswer(answerText);
  }

  return (
    <div className="flex flex-col">
      <h1>Host</h1>
      <textarea value={offer} />
      <hr />
      <textarea onChange={(e) => setAnswer(e.target.value)} value={answer} />
      <button onClick={() => respondAnswer(answer)}>Respond Answer</button>
      <hr />
      {logs.map((v) => (
        <p>{v}</p>
      ))}
    </div>
  );
}

function ClientView() {
  const [offer, setOffer] = useState("");
  const [answer, setAnswer] = useState("");
  const [msg, setMsg] = useState("");
  const conn = useRef(new PeerConnection());

  async function connect(offerText: string) {
    const answerText = await conn.current.connectToOffer(offerText);
    setAnswer(answerText);
  }

  async function sendMsg() {
    conn.current.sendMessage(msg);
  }

  return (
    <div className="flex flex-col">
      <h1>client</h1>
      <textarea value={answer} />
      <hr />
      <textarea onChange={(e) => setOffer(e.target.value)} value={offer} />
      <button onClick={() => connect(offer)}>Connect</button>
      <hr />
      <input type="text" onChange={(e) => setMsg(e.target.value)} value={msg} />
      <button onClick={() => sendMsg()}>Send message</button>
    </div>
  );
}

export function TestView() {
  const [type, setType] = useState<null | "host" | "client">(null);

  if (type === "client") return <ClientView />;
  if (type === "host") return <HostView />;

  return (
    <div className="flex flex-col">
      <Title>Choose type</Title>
      <IconButton icon={Icons.MOVIE_WEB} onClick={() => setType("host")}>
        <p>Be host</p>
      </IconButton>
      <IconButton icon={Icons.MOVIE_WEB} onClick={() => setType("client")}>
        <p>Be client</p>
      </IconButton>
    </div>
  );
}
