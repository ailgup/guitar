import React, { useState, useCallback, useEffect } from 'react';

import {
  TextInput,
  Button,
  RangeInput,
  Box,
  Text,
  Spinner
} from 'grommet';

import { parse, transpose, prettyPrint } from 'chord-magic';

import generatePDF from './lib/generate-pdf';

import './App.css';

const corsURI = process.env.REACT_APP_CORS_SERVER;

function formatChords(chords) {
  let formattedChords = chords;

  formattedChords = formattedChords.replace(/\[ch\]/g, '<b>');
  formattedChords = formattedChords.replace(/\[\/ch\]/g, '</b>');

  formattedChords = formattedChords.replace(/\[tab\]/g, '<div>');
  formattedChords = formattedChords.replace(/\[\/tab\]/g, '</div>');

  const lines = (formattedChords.match(/\n/g) || '').length + 1
  console.log(":Lines:"+lines)
  const splitString = formattedChords.split(/\n/g)
  let first_half = splitString.slice(0,lines/2).join("");
  let second_half = splitString.slice(lines/2,lines).join("");
  let first_third = splitString.slice(0,lines/3).join("");
  let second_third = splitString.slice(lines/3,lines*2/3).join("");
  let third_third = splitString.slice(lines*2/3,lines).join("");
let ary = [{ __html: formattedChords },{ __html: first_half },{ __html: second_half },{ __html: first_third },{ __html: second_third },{ __html: third_third },{__html: ""}];
  console.log(ary)
  return ary
}


// taken from YagoLopez
// https://gist.github.com/YagoLopez
// https://gist.github.com/YagoLopez/1c2fe87d255fc64d5f1bf6a920b67484
function findInObject(obj, key) {
  let objects = [];
  const keys = Object.keys(obj || {});

  for (let i = 0; i < keys.length; i += 1) {
    const _key = keys[i];
    if (Object.prototype.hasOwnProperty.call(obj, _key)) {
      if (typeof obj[_key] === 'object') {
        objects = [...objects, ...findInObject(obj[_key], key)];
      } else if (_key === key) {
        objects.push(obj[_key]);
      }
    }
  }

  return objects;
}

function App() {
	/* 5 states, pre-search, search, post-search, load, post-load */
	
  const [preSearchState, setPreSearchState] = React.useState(true)
  const [searchState, setSearchState] = React.useState(false)
  const [postSearchState, setPostSearchState] = React.useState(false)
  const [loadState, setLoadState] = React.useState(false)
  const [postLoadState, setPostLoadState] = React.useState(false)
  
  const [uri, setUri] = useState('');
  const [search, setSearch] = useState('')
  const [chords, setChords] = useState('Search for a song');
  const [artist, setArtist] = useState('');
  const [song, setSong] = useState('');
  
  const [searchResults, setSearchResults] = useState('');
  const [chordShapes, setChordShapes] = useState([]);

  //const [parsingStyle, setParsingStyle] = useState(undefined);
  const [halftoneStyle, setHalftoneStyle] = useState('FLATS');
  const [simplify, setSimplify] = useState(false);

  const [transposeStep, setTransposeStep] = useState(0);
  
  const [fontStep, setFontStep] = useState(10);
  
  const [colStep, setColStep] = useState(1);
  
  const [transposedChords, setTransposedChords] = useState(chords);

  const renderChords = useCallback(() => formatChords(transposedChords), [transposedChords]);
  const downloadPdf = useCallback(() => generatePDF(artist, song, transposedChords), [artist,song,transposedChords]);
  
	  
  const loadSearch = useCallback((e,pge) => {
    if (e !== undefined){
		e.preventDefault();
		e.stopPropagation();
		console.log("undefined");
	}

	setPostLoadState(false);
	setPreSearchState(false);
	setSearchState(true);

	var url = `${corsURI}https://www.ultimate-guitar.com/search.php?search_type=title&page=${pge}&value=${encodeURIComponent(search)}`;
    console.log(url)
	fetch(url)
      .then(res => res.text())
      .then(text => {
          const div = document.createElement('div');
        div.innerHTML = text;
        const [store] = div.getElementsByClassName('js-store');
        const storeJson = store.getAttribute('data-content');
        const storeData = JSON.parse(storeJson);
        const pagination = storeData.store.page.data.pagination; //current, total
        //console.log(storeData)
        const searchResults = storeData.store.page.data.results;
        //console.log(searchResults)
        var table = [<thead><tr><th>Artist</th><th>Song</th><th>Rating</th><th>Votes</th><th>Type</th></tr></thead>];
        var prev = {song_name:"",artist_name:""}
        for (let [key,value] of Object.entries(searchResults)) {
            
            if (!["Power","Video","","Official","Pro","Ukulele Chords","Bass Tabs","Drum Tabs"].includes(value.type)){
                if (typeof value.tab_url === 'string') {
				if(value.tab_url.includes("tabs.ultimate-guitar.com/tab/")){
                    var song_name = value.song_name
                    var artist_name = value.artist_name

                    if (artist_name === prev.artist_name){
                        artist_name = ""
                    }
                    if (song_name === prev.song_name){
                        
                    }
                    if (song_name==="" && artist_name===""){

                        
                    }
                    var stars = "⭐".repeat(Math.floor(value.rating))
                    prev = value
                    
                    table.push(
				<tr style={{ backgroundColor: value.type==="Tabs"?"LightGrey":"white"}} key={"row-"+key}>
                            <td key={"artist-"+key}>                                
                                    {artist_name}
                            </td>
                            <td key={"linkcell-"+key}><a key={"link-"+key} href="#chords" 
                                    onClick={()=>{setLoadState(true);setUri(value.tab_url);}}>                                  
                                    {song_name}
                                </a></td>
                            <td key={"stars-"+key}>{stars}</td>
                            <td key={"votes-"+key}>{value.votes}</td>
                            <td key={"type-"+key}>{value.type}</td>
                        </tr>)
                }
				}
            }
        }


		var next_button = <button onClick={e =>loadSearch(e,pagination.current+1)}>▶</button>;
        var prev_button = <button onClick={e =>loadSearch(e,pagination.current-1)}>◀</button>;
        if (pagination.current === 1){
            prev_button=""}
        if (pagination.current === pagination.total){
            next_button=""}
        table.push(<p>{prev_button}  Page {pagination.current} of {pagination.total}  {next_button}</p>);
		//table.push(</table>);
		
        setSearchResults(table);
		
		setSearchState(false);
		setPostSearchState(true);
		
      });
  }, [search]);

  const loadSong = useCallback(() => {
	  
    if (uri.includes("tabs.ultimate-guitar.com")){
    fetch(`${corsURI}${uri}`)
      .then(res => res.text())
      .then(text => {
        const div = document.createElement('div');
        div.innerHTML = text;
        const [store] = div.getElementsByClassName('js-store');
        const storeJson = store.getAttribute('data-content');

        const storeData = JSON.parse(storeJson);
        //console.log(storeData)
        const chordArray = storeData.store.page.data.tab_view.applicature
        var parsedShapes = []
        if (chordArray != null){
        for (let [key, value] of Object.entries(chordArray)) {
            //https://chordgenerator.net/D.png?p=xx0232&f=---132
			console.log(value[0]);
			if (value[0] !== undefined){
            var fingers = value[0].fingers.reverse().join('').replace(/0/g, "-")
            var frets = value[0].frets.reverse().join('').replace(/-1/g, "x")
            
            var shape = "https://chordgenerator.net/"+encodeURIComponent(key)+".png?p="+frets+"&f="+fingers+"&s=1";
            parsedShapes.push(<img alt='chord' key={key} src={shape} />)
			}
        
        }
        }
        const [parsedSongName] = findInObject(storeData, 'song_name');
        const [parsedArtistName] = findInObject(storeData, 'artist_name');
        const [parsedChords] = findInObject(storeData, 'content');
        //console.log(parsedChords)
        setArtist(parsedArtistName);
        setSong(parsedSongName);
        setChords(parsedChords);
        setChordShapes(parsedShapes);
		setLoadState(false)
		setPostLoadState(true)
      });
    }
    else{
        setSong("");
    }
  }, [uri]);
     useEffect(() => {
        console.log('state changed', uri)
        // write your callback function here
        loadSong()
		setSearchResults("")
      }, [uri,loadSong]);
     
  useEffect(() => {
    const parseOptions = {};

    let transChords = chords.split(/\[ch\]|\[\/ch\]/g);
    let regex = [];


    for (let i = 1; i <= transChords.length; i += 2) {
      const chord = transChords[i];

      if (chord) {
        try {
          let tones = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];

          if (halftoneStyle === 'FLATS') {
            tones = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];
          }

          const parsedChord = parse(chord, parseOptions);
          const transChord = transpose(parsedChord, transposeStep);

          if (simplify) {
            delete transChord.extended;
            delete transChord.suspended;
            delete transChord.added;
            delete transChord.overridingRoot;
          }

          const prettyChord = prettyPrint(parsedChord, { naming: tones });
          const prettyTransChord = prettyPrint(transChord, { naming: tones });

          const chordsDiff = prettyTransChord.length - prettyChord.length;
          const chordsDiffPos = Math.abs(chordsDiff);

          const replacer = chordsDiff >= 0 ? '-'.repeat(chordsDiff) : ' '.repeat(chordsDiffPos);

          transChords[i] = `[ch]${prettyTransChord}[/ch]`;
          transChords[i] += replacer;

          if (chordsDiff >= 0) {
            regex.push(replacer + ' '.repeat(chordsDiff));
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.info('failed to transpose', chord);
        }
      }
    }

    regex = regex.filter(r => r.length > 1);
    regex = [...new Set(regex)];

    transChords = transChords
      .join('')
      .replace(new RegExp(regex.join('|'), 'gm'), '')
      //.replace(new RegExp('-+(\\n|\\r|\\S)', 'gm'), '$1')
      .replace(/\[\/ch\]\s\[ch\]/g, '[/ch]  [ch]')
      .replace(/\[\/ch\]\[ch\]/g, '[/ch] [ch]')
      .replace(/\[\/ch\](\w)/g, '[/ch] $1');

    setTransposedChords(transChords);
  }, [transposeStep, chords, halftoneStyle, simplify]);
      
  return (
    <>
      <div className="controls">
        
			
			<form onSubmit={e =>loadSearch(e,1)} className="commentForm">
            
				<Box direction="row" gap="small">
					<TextInput pad='small' placeholder="Artist or Song Name" value={search} onChange={e => setSearch(e.target.value)} />
					<Button  pad='small' primary type="submit" label="Search" />
				</Box>
					{ postLoadState ? 
					<Box direction="row" pad='small'>
					  <Text>{`TRANSPOSE: ${transposeStep}`}</Text>
					  <RangeInput
						//style={{ minWidth: '100px' }}
						min={-12}
						max={12}
						step={1}
						value={transposeStep}
						onChange={e => setTransposeStep(parseInt(e.currentTarget.value, 10))}
					  />
					  <Text>{`FONT: ${fontStep}`}</Text>
					  <RangeInput
						//style={{ minWidth: '100px' }}
						min={1}
						max={20}
						step={1}
						value={fontStep}
						onChange={e => setFontStep(parseInt(e.currentTarget.value, 10))}
					  />
					  <Text>{`COLS: ${colStep}`}</Text>
					  <RangeInput
						//style={{ minWidth: '100px' }}
						min={1}
						max={3}
						step={1}
						value={colStep}
						onChange={e => setColStep(parseInt(e.currentTarget.value, 10))}
					  />
					</Box>
						
					: null }		
			</form>
			
      </div>
	  
		<div className="spinner">{ searchState ? <Spinner /> : null }</div>
			<Box direction="row" gap="small">
			<div className="searchResults">{searchResults}</div>
			</Box>
        {/*<TextInput style={{display:"none", margin:0}} value={uri} onChange={e => setUri(e.target.value)} />*/}

{/*
        <Box className="box-2" pad="none" style={{ flexDirection: 'row' }}>
            <Button primary onClick={loadSong} label="LOAD SONG" />
          
        </Box>*/}

        {/*  <Select
           options={['NORMAL', 'NORTHERN EUROPEAN', 'SOUTHERN EUROPEAN']}
           placeholder={'PARSING STYLE'}
           value={parsingStyle}
           onChange={({ option }) => setParsingStyle(option)}
        /> 

        <Box className="box-3" pad="none" style={{ flexDirection: 'row' }}>
           <RadioButtonGroup
             name="halftoneStyle"
             options={['SHARPS', 'FLATS']}
             value={halftoneStyle}
             onChange={e => setHalftoneStyle(e.currentTarget.value)}
           />

          <CheckBox
            label="SIMPLIFY"
            checked={simplify}
            onChange={e => setSimplify(e.target.checked)}
          />
        </Box>
        */}

      <div className="sheet">
        <div className="artist">{artist}</div>
        <div className="song">{song}</div>
        <div className="chordShapes">{chordShapes}</div>
		
		<div className="spinner">{ loadState ? <Spinner /> : null }</div>
		<div className="grid-container">
            <div style={{fontSize: `${fontStep}px` }} id = "chords" className="chords grid-item" 
				dangerouslySetInnerHTML={renderChords(transposedChords)
				[colStep===1 ? 0 : colStep===2 ? 1 : colStep===3?3:6]}>
			</div>
			<div style={{fontSize: `${fontStep}px` }} className="chords grid-item" dangerouslySetInnerHTML={renderChords(transposedChords)
			[colStep===1 ? 6 : colStep===2 ? 2 : colStep===3?4:6]}>
			</div>
			<div style={{fontSize: `${fontStep}px` }} className="chords grid-item" dangerouslySetInnerHTML={renderChords(transposedChords)
			[colStep===1 ? 6 : colStep===2 ? 6 : colStep===3?5:6]}>
			</div>
			</div>
			{ postLoadState ? <Button primary onClick={downloadPdf} label="Download PDF" /> : null}
      </div>
	  <div>
	  <a target="_blank" rel="noopener noreferrer" href="http://www.carloacutis.com">
	  <img alt="Bl. Carlo Acutis" id="carlo-icon" src={require('./carlo3.png')} height="40px"/>
	  </a>
	  </div>
    </>
  );
}

export default App;
