/**************************************************/
/*                                                */
/*     波形データ＆周波数スペクトル               */
/*                                      v1.00     */
/*                                                */
/*     https://www.petitmonte.com/                */
/*                                                */
/*     Copyright 2019 Takeshi Okamoto (Japan)     */
/*     Released under the MIT license             */
/*                                                */
/*                            Date: 2019-02-12    */
/**************************************************/

// キャンバス
var canvas1,canvas2;
var ctx1,ctx2;

// 各オブジェクト
var audioCtx;          // (共通)
var audioSourceNode;   // (共通)   
var analyserNode_wave; // 波形データ
var analyserNode_sp;   // 周波数スペクトル
var tracks;            // トラック

// HTMLMediaElement用
var audioEle;
var wm = new WeakMap();

// 各種フラグ
var firstFlag = true;
var stopFlg = false;
var pauseFlg = false; 

// データ
var data1,data2;

// 波形データ用
// ※変更可能(32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768) 
var wa_width = 512; 

// 周波数スペクトル用
var sp_width = 700;   // ※変更可能
var sp_height = 255;
var sp_padding_top = 15;
var sp_padding_left = 50;
var sp_padding_bottom = 25;

var sp_fftSize = 2048;  // fftのサイズ ※変更可能
var sp_fs;              // 周波数分解能(Frequency resolution)
var sp_440Hz;           // 440Hzの横幅
var sp_8192Hz_fftSize;  // 8192Hzのfftの最大サイズ

window.onload = function(){
  canvas1 = document.getElementById('canvas1');
  canvas2 = document.getElementById('canvas2');
  ctx1 = canvas1.getContext('2d') ;
  ctx2 = canvas2.getContext('2d') ;
    
  ctx1.lineWidth = ctx2.lineWidth =  1;
  ctx1.strokeStyle = ctx2.strokeStyle = 'rgb(0, 0, 255)';   
  ctx1.fillStyle = ctx2.fillStyle = 'rgb(255, 255, 255)';
  
  canvas1.width  = wa_width;
  canvas1.height = 255;
  canvas2.width  =  sp_width  + sp_padding_left;
  canvas2.height =  sp_height + sp_padding_top + sp_padding_bottom;
  
  ctx1.clearRect(0, 0, canvas1.width, canvas1.height);
  ctx2.clearRect(0, 0, canvas2.width, canvas2.height); 
  
  audioEle = document.getElementById('myAudio');
  audioEle.autoplay = true;
  audioEle.preload = 'auto'; 
  
  audioEle.onplaying = function (){ 
    pauseFlg = false;   
    draw();
  }

  audioEle.onpause = function (){ 
    pauseFlg = true;   
  }
    
  audioEle.onloadeddata = function (){ 
    play(false);
  };   
}

function draw(){
  
  if(pauseFlg) return;

  if(!stopFlg){
    requestAnimationFrame(draw); 
  }     

  // *********************
  //  波形データ
  // *********************
  analyserNode_wave.getByteTimeDomainData(data1);  
  ctx1.fillStyle = "rgb(0, 0, 0)";  
  ctx1.fillRect(0, 0, canvas1.width, canvas1.height);      
  
  // 中央の青線
  ctx1.strokeStyle = 'rgb(0, 0, 255)';  
  ctx1.beginPath();
    ctx1.moveTo(0, 127);
    ctx1.lineTo(canvas1.width,127);
  ctx1.stroke();

  // [1本の線のみ]
  // ※1本の線を表示したい場合はこちらを使用します。
  //ctx1.strokeStyle = 'rgb(0, 0, 255)';  
  //ctx1.beginPath();
  //  ctx1.moveTo(0, data1[0]);
  //  for(var i = 0; i < wa_width; i++) {
  //    ctx1.lineTo(i, data1[i]);
  //  }
  //ctx1.stroke();

  // [塗りつぶし]
  ctx1.strokeStyle = "rgb(0, 0, 255)";       
  for(var i = 0; i < wa_width; i++) {
    var diff= Math.abs(data1[i] -127);
    if(data1[i]>127){
      ctx1.moveTo(i, 127 + diff);
      ctx1.lineTo(i, 127);
    }else{
      ctx1.moveTo(i, 127 - diff);
      ctx1.lineTo(i, 127);          
    }    
  }
  ctx1.stroke();

  // *********************
  //  周波数スペクトル
  // *********************
  analyserNode_sp.getByteFrequencyData(data2);      
  ctx2.fillStyle = "rgb(0, 0, 0)";      
  ctx2.fillRect(0, 0, canvas2.width, canvas2.height);      

  // --------------------
  //  グリッド
  // --------------------
  // (横線) 0 ～ -140の15段階に分割 
  ctx2.lineWidth = 1;         
  ctx2.strokeStyle = 'rgb(255,0, 0)';
  ctx2.beginPath();
    for(var i = 0; i <= 14; i++) {
      ctx2.moveTo(sp_padding_left, 255/14 *i + sp_padding_top);
      ctx2.lineTo(sp_width + sp_padding_left, 255/14 *i + sp_padding_top);
    }
  ctx2.stroke();

  // (縦線) 0,440,880,1760,3520,7040Hzの線
  ctx2.strokeStyle = 'rgb(255,0, 0)';
  ctx2.beginPath();      
    // 一番左
    ctx2.moveTo(sp_padding_left, sp_padding_top);
    ctx2.lineTo(sp_padding_left, sp_height + sp_padding_top); 
    // その他
    ctx2.lineWidth = 2;  
    var shl = 1;
    for(var i=0; i < 5; i++) {
      ctx2.moveTo(sp_440Hz * shl * (sp_width/sp_8192Hz_fftSize) + sp_padding_left, sp_padding_top);
      ctx2.lineTo(sp_440Hz * shl * (sp_width/sp_8192Hz_fftSize) + sp_padding_left, sp_height + sp_padding_top);      
      shl = shl << 1;
    }           
  ctx2.stroke();

  // 中央の緑線
  ctx2.strokeStyle = 'rgb(0,255, 0)';
  ctx2.beginPath();
    ctx2.moveTo(sp_padding_left, 127 + sp_padding_top);
    ctx2.lineTo(sp_width +  sp_padding_left, 127 + sp_padding_top );
  ctx2.stroke();

  // --------------------
  //  強度
  // --------------------
  // 0 ～ 8192Hzまでの強度
  ctx2.lineWidth = 2;      
  ctx2.strokeStyle = 'rgb(0, 0, 255)';
  ctx2.beginPath();
    ctx2.moveTo(sp_padding_left,  255 - data2[0] + sp_padding_top);
    for(var i=0; i < sp_8192Hz_fftSize; i++) {
       ctx2.lineTo((i* (sp_width/sp_8192Hz_fftSize)) + sp_padding_left, 255 - data2[i] + sp_padding_top);                    
    }
  ctx2.stroke();   

  // --------------------
  //  テキスト
  // --------------------   
  // デシベル(dB)
  var dB;
  ctx2.fillStyle = 'rgb(255, 255, 255)';
  ctx2.font  = '12px "Times New Roman"';       

  for(var i = 0; i < 15; i++) {
    switch(i){
      case 0: 
        dB = '     0 dB'; break;
      case 10:;case 11:;case 12:;case 13:;case 14:;
        dB = ( i*10*-1 + ' dB');break;
      default:
        dB = '  ' + (i*10*-1) + ' dB';
    }        
    ctx2.fillText(dB, 5, 255/14 *i + sp_padding_top+3);
  }            

  // 周波数
  var shl = 1;
  for(var i=0; i < 5; i++) {
    ctx2.fillText((shl* 440) + 'Hz',
                   sp_440Hz * shl * (sp_width/sp_8192Hz_fftSize) + sp_padding_left - 17,
                   sp_height +  sp_padding_top +15);            
    shl = shl << 1;
  }
}

function voice_processing(output){    
  
  // AnalyserNodeの生成(波形データ) 
  if(analyserNode_wave){
    analyserNode_wave.disconnect();
  }                
  analyserNode_wave = audioCtx.createAnalyser();  
  analyserNode_wave.fftSize = wa_width;    
   
  // AnalyserNodeの生成(周波数スペクトル) 
  if(analyserNode_sp){
    analyserNode_sp.disconnect();
  }            
  analyserNode_sp = audioCtx.createAnalyser();     
  analyserNode_sp.fftSize = sp_fftSize;       

  // 周波数分解能(周波数スペクトルの横幅の1単位の周波数) 
  // ※sampleRateはコンピュータによって異なる。仮に48,000Hzの場合は48000/2048 = 23.4375
  sp_fs = audioCtx.sampleRate / analyserNode_sp.fftSize;
  
  // 周波数スペクトルの0Hz ～ 8192Hzのfftの最大サイズ
  sp_8192Hz_fftSize = Math.ceil(8192 / sp_fs);    

  // 周波数スペクトルの440Hzのグリッド横幅
  sp_440Hz = 440 / sp_fs;
         
  analyserNode_sp.maxDecibels = 0;     // デフォルト -30
  analyserNode_sp.minDecibels = -140;  // デフォルト -100     
     
  data1 = new Uint8Array(wa_width);
  data2 = new Uint8Array(sp_8192Hz_fftSize);    
  
  // オーディオノードの設定
  audioSourceNode.connect(analyserNode_sp);    
  audioSourceNode.connect(analyserNode_wave);
  if(output){
    analyserNode_sp.connect(audioCtx.destination);
  }
  
  draw();    
}

function play(microphone){
   
  if(tracks) return;
  
  stopFlg = false; 
  
  if(firstFlag){
    // AudioContextの生成
    audioCtx =  new AudioContext(); 
    firstFlag = false;     
  }    
  
  // マイク  
  if(microphone){      
        
      stop();
    
      // 非推奨(ウェブ標準から削除)
      if(navigator.getUserMedia){    
        console.log("USE: navigator.getUserMedia()");

        navigator.getUserMedia(    
            {video: false, audio: true},
            function(stream) { 
              tracks = stream.getTracks();       
        
              // MediaElementAudioSourceNodeの生成       
              if(audioSourceNode){
                audioSourceNode.disconnect();
              }                           
              audioSourceNode = audioCtx.createMediaStreamSource(stream);    

              document.getElementById('btn_play').disabled = true;  
              document.getElementById('btn_stop').disabled = false;
              pauseFlg = false;              
              voice_processing(false); 
            },        

            function(err) {
              console.log(err);               
            }
        );
            
      // こちらが将来的にウェブ標準予定  
      }else{    
        navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        }).then(function (stream) {      
          tracks = stream.getTracks(); 
          
          // MediaElementAudioSourceNodeの生成       
          if(audioSourceNode){
            audioSourceNode.disconnect();
          }                           
          audioSourceNode = audioCtx.createMediaStreamSource(stream);    
                       
          document.getElementById('btn_play').disabled = true;                         
          document.getElementById('btn_stop').disabled = false;   
          pauseFlg = false;                        
          voice_processing(false);       
        }).catch(function (err) {    
           console.log(err);
        });
      }
      
  // ファイル    
  }else{
    if(audioSourceNode){
      audioSourceNode.disconnect();
    }    
    
    // WeakMapでHTMLMediaElementを保持する
    if (wm.has(audioEle)) { 
      audioSourceNode = wm.get(audioEle); 
    } else { 
      audioSourceNode = audioCtx.createMediaElementSource(audioEle); 
      wm.set(audioEle, audioSourceNode); 
    }          
    voice_processing(true);      
  }
}
 
function stop(){
  
  if(audioEle.src){    
         
    // audioEle.src="" でアラートを表示させない
    audioEle.onerror = function (e) {}
      
    audioEle.pause();
    audioEle.src = "";
  } 

  if(tracks){
    tracks.forEach(function(track) {
      track.stop();
    });
    tracks = null;
    stopFlg = true;
  }
  
  document.getElementById('btn_stop').disabled = true;
  document.getElementById('btn_play').disabled = false;     
}

function onSelected(){
  stop();
    
  if (document.getElementById("list").value ==  0) audioEle.src = '';
  if (document.getElementById("list").value ==  1) audioEle.src = 'waveform_spectrum_sandstorm.mp3';
  if (document.getElementById("list").value ==  2) audioEle.src = 'waveform_spectrum_voice.mp3';  
  if (document.getElementById("list").value ==  3) audioEle.src = 'waveform_spectrum_sine.mp3';
  if (document.getElementById("list").value ==  4) audioEle.src = 'waveform_spectrum_triangle.mp3';
  if (document.getElementById("list").value ==  5) audioEle.src = 'waveform_spectrum_square.mp3';
  if (document.getElementById("list").value ==  6) audioEle.src = 'waveform_spectrum_sawtooth.mp3';  
}
 
function onDragOver(event){ 
  event.preventDefault(); 
} 
  
function onDrop(event){
  onAddFile(event);
  event.preventDefault(); 
}  

function onAddFile(event) {
  var files;
  var reader = new FileReader();
  
  if(event.target.files){
    files = event.target.files;
  }else{ 
    files = event.dataTransfer.files;   
  }      
      
  reader.onload = function (event) {
    
    stop();      
      
    audioEle.onerror = function (e) {
      alert("このファイルは読み込めません。");
    }  
        
    audioEle.src = reader.result;       
  };
  
  if (files[0]){    
    reader.readAsDataURL(files[0]); 
  }
}      