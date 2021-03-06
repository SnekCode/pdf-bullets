import React from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAngleDown } from "@fortawesome/free-solid-svg-icons"

const pdfjs = require('@ckhordiasma/pdfjs-dist');
const pdfjsWorker = require('@ckhordiasma/pdfjs-dist/build/pdf.worker.entry');
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

//PDF import
class ImportTools extends React.PureComponent {
    constructor(props) {
        super(props);
        this.fileInputRef = React.createRef();
        this.state = {
            type: 'none',
            hovering: false,
        }
    }

    importFile = (e) => {
        if (!this.fileInputRef.current.value) {
            console.log('no file picked');
            return;
        } else {
            let callback = (file) => { console.log(file) };
            if (this.state.type === 'PDF') {
                callback = this.getDataFromPDF;
            } else if (this.state.type === 'JSON') {
                callback = this.getDataFromJSON;
            }
            //return Promise.resolve(this.fileInputRef.current.files[0]).then(callback).then(() => {
            //    this.fileInputRef.current.value = ''});
            callback(this.fileInputRef.current.files[0]);
            this.fileInputRef.current.value = '';
        }
    }
    inputClick = (importType) => {
        return () => {
            this.setState({
                type: importType,
            });
            this.fileInputRef.current.click();
        };
    }
    getDataFromPDF = (file) => {
        const { pullBullets, getPageInfo } = getBulletsFromPdf(file);
        //note: these promises are PDFJS promises, not ES promises

        //was not able to call this (this.props.onTextUpdate) inside the "then" scope, so I const'ed them out
        const textUpdater = this.props.onTextUpdate;
        const widthUpdater = this.props.onWidthUpdate;

        Promise.all([pullBullets, getPageInfo]).then(([bulletsHTML, pageData]) => {
            widthUpdater(parseFloat(pageData.width))();

            // This is needed to convert the bullets HTML into normal text. It gets rid of things like &amp;
            const bullets =
                new DOMParser().parseFromString(bulletsHTML, 'text/html').documentElement.textContent;
            textUpdater(bullets)();
        });

    }
    getDataFromJSON = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {

            const data = JSON.parse(e.target.result);

            this.props.onJSONImport(data);
        };
        reader.readAsText(file)
    }

    hoverOut = () => {
        this.setState({ hovering: false });
    }
    toggleMenu = () => {
        const current = this.state.hovering;
        this.setState({ hovering: !current });
    }
    render() {
        const menuState = this.state.hovering ? "is-active" : "";
        return (
            <div className={"dropdown " + menuState}>
                <input type="file" onChange={this.importFile} style={{ display: "none" }} ref={this.fileInputRef}></input>
                <div className="dropdown-trigger">
                    <div className="buttons has-addons">
                        <button className="button" onClick={this.inputClick('PDF')}>Import</button>
                        <button className="button" onClick={this.toggleMenu} aria-haspopup="true" aria-controls="import-menu" >
                            <span className="icon">

                                <FontAwesomeIcon icon={faAngleDown} />
                            </span>
                        </button>
                    </div>
                </div>
                <div className="dropdown-menu" id="import-menu" role="menu" onMouseLeave={this.hoverOut}>
                    <div className="dropdown-content">
                        <a href="?#" className="dropdown-item" onClick={this.inputClick('PDF')}>PDF</a>
                        <a href="?#" className="dropdown-item" onClick={this.inputClick('JSON')}>JSON</a>
                    </div>
                </div>
            </div>
        );
    }
}
// form width, space optimization, select text
class OutputTools extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {

        }
    }
    render() {
        const widthAWD = 202.321;
        const widthEPR = 202.321;
        const widthOPR = 201.041;
        return (
            <div className="field is-grouped">
                {/* if I want to group things together in a field, each subelement must have the control class name */}
                <div className="control field has-addons">
                    <div className="control has-icons-right">
                        <input className="input" id="widthInput" type='number' min="100" max="500" step=".001" value={this.props.width} onChange={this.props.onWidthChange}></input>
                        <span className='icon is-right'>mm</span>
                    </div>
                    <div className="control buttons has-addons">
                        <a  className={"button is-primary "  + (this.props.width === widthAWD ? '' : 'is-outlined')}
                            onClick={this.props.onWidthUpdate(widthAWD)}>AWD</a>
                        <a className={"button is-success "  + (this.props.width === widthEPR ? '' : 'is-outlined')}
                            onClick={this.props.onWidthUpdate(widthEPR)}>EPR</a>
                        <a  className={"button is-link " + (this.props.width === widthOPR ? '' : 'is-outlined')}
                            onClick={this.props.onWidthUpdate(widthOPR)}>OPR</a>
                    </div>

                </div>

                <a  className={"control button is-dark" + (this.props.enableOptim ? '' : "is-outlined")}
                    onClick={this.props.onOptimChange} id="enableOptim">Auto-Space</a>
            </div>
        );
    }
}
// normalize spaces
class InputTools extends React.PureComponent {

    render() {
        return (
            <button className="button" onClick={this.props.onTextNorm}>Renormalize Input Spacing</button>
        );
    }
}
// saving settings
class SaveTools extends React.PureComponent {
    constructor(props) {
        super(props);
        this.exportRef = React.createRef();
        this.state = { hovering: false };
    }
    onSave = () => {
        const settings = this.props.onSave();
        //JSON stringifying an array for future growth
        const storedData = JSON.stringify([settings]);
        try {
            localStorage.setItem('bullet-settings', storedData);
            console.log("saved settings/data to local storage with character length " + storedData.length);
        } catch (err) {
            if (err.name === 'SecurityError') {
                alert("Sorry, saving to cookies does not work using the file:// interface and/or your browser's privacy settings")
            } else {
                throw err;
            }
        }
    }
    onExport = () => {
        const settings = this.props.onSave();
        //JSON stringifying an array for future growth
        const storedData = JSON.stringify([settings]);
        const dataURI = 'data:application/JSON;charset=utf-8,' + encodeURIComponent(storedData);
        this.exportRef.current.href = dataURI;
        this.exportRef.current.click();
        console.log("exported settings/data to JSON file with character length " + storedData.length);

    }
    hoverOut = () => {
        this.setState({ hovering: false });
    }
    toggleMenu = () => {
        const current = this.state.hovering;
        this.setState({ hovering: !current });
    }
    render() {
        const menuState = this.state.hovering ? "is-active" : "";
        return (
            <div className={'dropdown ' + menuState}>
                <div className="dropdown-trigger">
                    <div className="buttons has-addons">
                        <button className="button" onClick={this.onSave}>Save </button>
                        <button className="button" aria-haspopup="true" aria-controls="save-menu" >
                            <span className="icon" onClick={this.toggleMenu} >
                                <FontAwesomeIcon icon={faAngleDown} />
                            </span>
                        </button>
                    </div>
                </div>
                <div className="dropdown-menu" id="save-menu" role="menu" onMouseLeave={this.hoverOut}>
                    <div className="dropdown-content">
                        <a href="?#" className="dropdown-item" onClick={this.onSave}>Cookie</a>
                        <a href="?#" className="dropdown-item" onClick={this.onExport}>JSON</a>
                    </div>
                </div>

                <a href="?#" style={{ display: "none" }} download='settings.json' ref={this.exportRef}></a>
            </div>
        );
    }
}
class Logo extends React.PureComponent {
    render() {
        return (
            <h1 className='title'><span className="logo">AF </span>
                <span className="logo">Bull</span>et
                <span className="logo"> Sh</span>aping &amp;
                <span className="logo"> i</span>teration
                <span className="logo"> t</span>ool
            </h1>
        );
    }
}
class ThesaurusTools extends React.PureComponent {
    render() {
        return (
            <a  className="button" onClick={this.props.onHide} aria-haspopup="true" aria-controls="thesaurus-menu" >
                <span>Thesaurus</span><span className="icon"  >
                    <FontAwesomeIcon icon={faAngleDown} />
                </span>
            </a>
        );
    }
}
class DocumentTools extends React.PureComponent {
    render() {
        return (
            <nav className="navbar" role="navigation" aria-label="main navigation">
                <div className="navbar-start">
                    <div className="navbar-item">
                        <SaveTools onSave={this.props.onSave} />
                    </div>
                    <div className="navbar-item">
                        <ImportTools onJSONImport={this.props.onJSONImport} onTextUpdate={this.props.onTextUpdate} onWidthUpdate={this.props.onWidthUpdate} />
                    </div>
                    <div className="navbar-item">
                        <OutputTools
                            enableOptim={this.props.enableOptim} onOptimChange={this.props.onOptimChange}
                            width={this.props.width} onWidthChange={this.props.onWidthChange}
                            onWidthUpdate={this.props.onWidthUpdate} />
                    </div>
                    <div className="navbar-item">
                        <InputTools onTextNorm={this.props.onTextNorm} />
                    </div>
                    <div className="navbar-item">
                        <ThesaurusTools onHide={this.props.onThesaurusHide} />
                    </div>
                </div>
            </nav>
        );
    }
}

// could not do a static class property because of MS edge
const Forms = {
    all: {
        'AF707': {
            'fields': ['S2DutyTitleDesc', 'S4Assessment', 'S5Assessment', 'S6Assessment'],
            'likelyWidth': '201.041mm'
        },
        'AF1206': {
            'fields': ['specificAccomplishments', 'p2SpecificAccomplishments'],
            'likelyWidth': '202.321mm'
        },
        'AF910': {
            'fields': ['KeyDuties', 'IIIComments', 'IVComments', 'VComments', 'VIIIComments', 'IXComments'],
            'likelyWidth': '202.321mm'
        },
        'AF911': {
            'fields': ['KeyDuties', 'IIIComments', 'IVComments', 'VIIComments', 'VIIIComments', 'IXComments'],
            'likelyWidth': '202.321mm'
        },
    }
};
function getBulletsFromPdf(filedata) {


    const pdfSetup = filedata.arrayBuffer().then(function (buffer) {
        const uint8Array = new Uint8Array(buffer);

        return pdfjs.getDocument({ data: uint8Array }).promise;

    });

    const getXFA = pdfSetup.then(function (pdf) {
        return pdf.getXFA();
    });

    const getFormName = pdfSetup.then(function (pdf) {
        return pdf.getMetadata().then(function (result) {
            const prefix = result.info.Custom["Short Title - Prefix"];
            const num = result.info.Custom["Short Title - Number"];
            return prefix + '' + num;
        })
    });
    const getAllData = Promise.all([getFormName, getXFA]);
    const pullBullets = getAllData.then(function (results) {

        const formName = results[0];
        const xfaDict = results[1];

        let datasetXML = xfaDict['datasets'];
        datasetXML = datasetXML.replace(/&#xD;/g, '\n');

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(datasetXML, "text/xml");

        let bulletText = '';
        for (let tagName of Forms.all[formName]['fields']) {
            const bulletTag = xmlDoc.querySelector(tagName);
            bulletText += bulletTag.innerHTML + '\n';
        }
        return bulletText;
    });

    const getPageInfo = getAllData.then(function (results) {

        const formName = results[0];
        const xfaDict = results[1];

        const templateXML = xfaDict['template'];
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(templateXML, "text/xml");

        let fonts = [];
        let fontSizes = []
        let widths = [];
        let i = 0;
        for (let tagName of Forms.all[formName]['fields']) {
            const bulletTag = xmlDoc.querySelector("field[name='" + tagName + "'");
            fonts[i] = bulletTag.querySelector('font').getAttribute('typeface');
            fontSizes[i] = bulletTag.querySelector('font').getAttribute('size');
            widths[i] = bulletTag.getAttribute('w');
            i += 1;
        }
        for (let font of fonts) {
            if (font !== fonts[0]) {
                console.log('warning: not all grabbed sections have the same font type');
                break;
            }
        }
        for (let fontSize of fontSizes) {
            if (fontSize !== fontSizes[0]) {
                console.log('warning: not all grabbed sections have the same font size');
                break;
            }
        }
        for (let width of widths) {
            if (width !== widths[0]) {
                console.log('warning: not all grabbed sections have the same width');
                break;
            }
        }

        return { 'font': fonts[0], 'fontSize': fontSizes[0], 'width': widths[0] }

        //accomplishmentsTag = templateXML.match(/name="specificAccomplishments"(.*?)<\/field/);
        //console.log(accomplishmentsTag)
    });
    return { pullBullets, getPageInfo };
}

function getSelectionInfo(editorState) {
    // this block of code gets the selected text from the editor.
    const selectionState = editorState.getSelection();
    const anchorKey = selectionState.getAnchorKey();
    const contentBlock = editorState.getCurrentContent().getBlockForKey(anchorKey);
    const start = selectionState.getStartOffset();
    const end = selectionState.getEndOffset();
    const selectedText = contentBlock.getText().slice(start, end);
    return {
        selectionState,
        anchorKey,
        contentBlock,
        start,
        end,
        selectedText,
    }
}

const findWithRegex = (regex, contentBlock, callback) => {
    const text = contentBlock.getText();
    let matchArr, start, end;
    while ((matchArr = regex.exec(text)) !== null) {
        start = matchArr.index;
        end = start + matchArr[0].length;
        callback(start, end);
    }
};


// all widths in this function are in pixels
function renderBulletText(text, getWidth, width) {
    
    width = width + 0.55;
    // this function expects a single line of text with no line breaks.
    if(text.match('\n')){
        console.error('renderBulletText expects a single line of text');
    }
    
    const fullWidth = getWidth(text.trimEnd());

    if (fullWidth < width) {
        return {
            textLines: [text],
            fullWidth: fullWidth,
            lines: 1,
            overflow: fullWidth - width,
        };
    } else {
        // Scenario where the width of the text is wider than desired.
        //  In this case, work needs to be done to figure out where the line breaks should be. 

        // Regex- split after one of the following: \u2004 \u2009 \u2006 \s ? / | - % ! 
        // but ONLY if immediately followed by: [a-zA-z] [0-9] + \
        const textSplit = text.split(/(?<=[\u2004\u2009\u2006\s?/|\-%!])(?=[a-zA-Z0-9+\\])/);

        // check to make sure the first token is smaller than the desired width.
        //   This is usually true, unless the desired width is abnormally small, or the 
        //   input text is one really long word
        if (getWidth(textSplit[0]) < width) {
            let answerIdx = 0;
            for (let i = 1; i <= textSplit.length; i++) {
                const evalText = textSplit.slice(0, i).join('').trimEnd();
                const evalWidth = getWidth(evalText);
                if (evalWidth > width) {
                    answerIdx = i - 1;
                    break;
                }
            }
            const recursedText = textSplit.slice(answerIdx, textSplit.length).join('');

            if (recursedText === text) {
                console.warn("Can't fit \"" + text + "\" on a single line\n", {text, width, fullWidth});
                return {
                    textLines: [text],
                    fullWidth,
                    lines: 1,
                    overflow: fullWidth - width,
                };
            } else {
                const recursedResult = renderBulletText(recursedText, getWidth, width);

                return {
                    textLines: [textSplit.slice(0, answerIdx).join(''), ...recursedResult.textLines],
                    fullWidth: fullWidth,
                    lines: 1 + recursedResult.lines,
                    overflow: fullWidth - width,
                }
            }

        } else {

            const avgCharWidth = fullWidth / (text.length);
            const guessIndex = parseInt(width / avgCharWidth);
            const firstGuessWidth = getWidth(text.substring(0, guessIndex))
            let answerIdx = guessIndex;
            if (firstGuessWidth > width) {
                for (let i = guessIndex - 1; i > 0; i--) {
                    const nextGuessWidth = getWidth(text.substring(0, i));
                    if (nextGuessWidth < width) {
                        answerIdx = i;
                        break;
                    }
                }
            } else if (firstGuessWidth < width) {
                for (let i = guessIndex; i <= text.length; i++) {

                    const nextGuessWidth = getWidth(text.substring(0, i));
                    if (nextGuessWidth > width) {
                        answerIdx = i - 1;
                        break;
                    }
                }
            }
            const recursedText = text.substring(answerIdx, text.length);
            if (recursedText === text) {
                console.warn("Can't fit \"" + text + "\" on a single line\n", {text, width, fullWidth});
                return {
                    textLines: [text],
                    fullWidth,
                    lines: 1,
                    overflow: fullWidth - width
                };
            } else {
                const recursedResult = renderBulletText(recursedText, getWidth, width);

                return {
                    textLines: [text.substring(0, answerIdx), ...recursedResult.textLines],
                    fullWidth: fullWidth,
                    lines: 1 + recursedResult.lines,
                    overflow: fullWidth - width,
                }
            }
        }
    }
}

function tokenize (sentence) {
    return sentence.split(/[\s]+/);
}

export { Logo, DocumentTools, getSelectionInfo, findWithRegex, renderBulletText, tokenize };
