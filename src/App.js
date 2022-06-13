import React, { useState, useCallback, useEffect } from 'react';

import {
  TextInput,
  Button,
  RangeInput,
  Box,
  Text
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

  return { __html: formattedChords };
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
  const [uri, setUri] = useState('');
  const [search, setSearch] = useState('Matt Maher')
  const [chords, setChords] = useState('Search for a song');
  const [artist, setArtist] = useState('');
  const [song, setSong] = useState('');
  
  const [searchResults, setSearchResults] = useState('');
  const [chordShapes, setChordShapes] = useState([]);

  const [parsingStyle, setParsingStyle] = useState(undefined);
  const [halftoneStyle, setHalftoneStyle] = useState('FLATS');
  const [simplify, setSimplify] = useState(false);

  const [transposeStep, setTransposeStep] = useState(0);
  const [transposedChords, setTransposedChords] = useState(chords);

  const renderChords = useCallback(() => formatChords(transposedChords), [transposedChords]);
  const downloadPdf = useCallback(() => generatePDF(artist, song, transposedChords), [artist,song,transposedChords]);
  
	  
  const loadSearch = useCallback((e,pge) => {
    if (e !== undefined){
		e.preventDefault();
		e.stopPropagation();
		console.log("undefined");
	}
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
        console.log(storeData)
        const searchResults = storeData.store.page.data.results;
        console.log(searchResults)
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
                        <tr key={"row-"+key}>
                            <td key={"artist-"+key}>                                
                                    {artist_name}
                            </td>
                            <td key={"linkcell-"+key}><a key={"link-"+key} href="#chords" 
                                    onClick={()=>{setUri(value.tab_url)}}>                                  
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
            
      });
  }, [search]);

  const loadSong = useCallback(() => {
	console.log("b")
    if (uri.includes("tabs.ultimate-guitar.com")){
    fetch(`${corsURI}${uri}`)
      .then(res => res.text())
      .then(text => {
        const div = document.createElement('div');
        div.innerHTML = text;
        const [store] = div.getElementsByClassName('js-store');
        const storeJson = store.getAttribute('data-content');

        const storeData = JSON.parse(storeJson);
        console.log(storeData)
        const chordArray = storeData.store.page.data.tab_view.applicature
        var parsedShapes = []
        if (chordArray != null){
        for (let [key, value] of Object.entries(chordArray)) {
            //https://chordgenerator.net/D.png?p=xx0232&f=---132
            var fingers = value[0].fingers.reverse().join('').replace(/0/g, "-")
            var frets = value[0].frets.reverse().join('').replace(/-1/g, "x")
            
            var shape = "https://chordgenerator.net/"+encodeURIComponent(key)+".png?p="+frets+"&f="+fingers+"&s=1";
            parsedShapes.push(<img alt='chord' key={key} src={shape} />)
        
        }
        }
        const [parsedSongName] = findInObject(storeData, 'song_name');
        const [parsedArtistName] = findInObject(storeData, 'artist_name');
        const [parsedChords] = findInObject(storeData, 'content');
        console.log(parsedChords)
        setArtist(parsedArtistName);
        setSong(parsedSongName);
        setChords(parsedChords);
        setChordShapes(parsedShapes);
      });
    }
    else{
        setSong("Invalid URL");
    }
  }, [uri]);
     useEffect(() => {
        console.log('state changed', uri)
        // write your callback function here
        loadSong()
		setSearchResults()
      }, [uri,loadSong]);
     
  useEffect(() => {
    const parseOptions = {};

    let transChords = chords.split(/\[ch\]|\[\/ch\]/g);
    let regex = [];
 
    switch (parsingStyle) {
      case 'NORTHERN EUROPEAN':
        parseOptions.naming = 'NorthernEuropean';
        break;

      case 'SOUTHERN EUROPEAN':
        parseOptions.naming = 'SouthernEuropean';
        break;

      case 'NORMAL':
      default:
        break;
    }

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
  }, [transposeStep, chords, parsingStyle, halftoneStyle, simplify]);
      
  return (
    <>
      <div className="controls">
        <form onSubmit={e =>loadSearch(e,1)} className="commentForm">
            <Box pad="none" style={{ flexDirection: 'row' }}>
                <TextInput value={search} onChange={e => setSearch(e.target.value)} />
                <Button primary type="submit" label="Search" />
            </Box>
        </form>
        <div className="searchResults">{searchResults}</div>
        
        <TextInput style={{display:"none"}} value={uri} onChange={e => setUri(e.target.value)} />

        <Box className="box-1" pad="none">
          <Text>{`TRANSPOSE: ${transposeStep}`}</Text>
          <RangeInput
            style={{ minWidth: '200px' }}
            min={-12}
            max={12}
            step={1}
            value={transposeStep}
            onChange={e => setTransposeStep(parseInt(e.currentTarget.value, 10))}
          />
        </Box>

        <Box className="box-2" pad="none" style={{ flexDirection: 'row' }}>
            {/*<Button primary onClick={loadSong} label="LOAD SONG" />*/}
          <Button primary onClick={downloadPdf} label="DOWNLOAD PDF" />
        </Box>

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
      </div>

      <div className="sheet">
        <div className="artist">{artist}</div>
        <div className="song">{song}</div>
        <div className="chordShapes">{chordShapes}</div>
            <div id = "chords" className="chords" dangerouslySetInnerHTML={renderChords(transposedChords)}></div>
      </div>
    </>
  );
}

export default App;
