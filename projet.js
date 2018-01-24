// Constantes
var VIDE = 0;
var MUR = 1;
var MARIO = 2;
var CAISSE = 4;
var OBJECTIF = 8;
var CAISSE_OK = CAISSE | OBJECTIF;

var GAUCHE = Caractere_vers_Ascii('Q');
var HAUT = Caractere_vers_Ascii('Z');
var DROITE = Caractere_vers_Ascii('D');
var BAS = Caractere_vers_Ascii('S');

var GRIDW = 34, GRIDH = 34;

var PADDINGX = 16, PADDINGY = 64;
var TOOL_PADDINGX = 16, TOOL_PADDINGY = 8;

var MODE_MENU = 0, MODE_GAME = 1, MODE_EDITOR = 2;

var TOOL_DEL = 0, TOOL_MUR = 1, TOOL_MARIO = 2, TOOL_CAISSE = 3, TOOL_OBJECTIF = 4, TOOL_CAISSEOK = 5;

var DefaultLevel = {
	"w": 3,
	"h": 3,
	"time": 180,
	"data": [1, 1, 1,
             2, 4, 8,
             1, 1, 1]
};

// Ressources
var mario, caisse, caisse_ok, mur, objectif;
var maps;

// Variables
var imap;
var mapCourante;
var marioX, marioY;
var marioDirection;
var w, h;
var timeLeft;
var lockLevel;
var mode, parentMode;
var timeoutId;
var mouseSelectX, mouseSelectY;
var editorTool;

/**
 * Procédure permettant l'affichage d'un texte dans le canvas (remplacement de celle d'agloscript)
 * x: position x de la boite du text
 * y: position y de la boite du text
 * w: largeur de la boite du text
 * h: hauteur de la boite du text
 * text: chaîne de caractère à afficher
 * font: police de caractère du texte
 * size: taille du text (en pt)
 * color: couleur du texte
 * style: style de mise en forme ("bold", "italic", "bold italic" "")
 * align: alignement horizontal du text ("left", "center" ou "right")
 * valign: alignement vertical du text ("top", "hanging", middle", "alphabetic", "ideographic", "bottom")
 */
Text = function(x, y, w, h, text, font = "sans", size = 12, color = "black", style = "", align = "left", valign = "top")
{
	var canvas = document.getElementById('mycanvas');
	var context = canvas.getContext('2d');

	if(align == "center")
		x += w/2;
	if(align == "right")
		x += w;
	if(valign == "middle")
		y += h/2;
	if(valign == "alphabetic" || valign == "ideographic" || valign == "bottom")
		y += h;

	context.textAlign = align;
	context.textBaseline = valign;
	context.font = style+" "+size+"pt "+font;
	context.fillStyle = color;
	context.fillText(text, x, y);
}


// Permet d'obtenir la composante x de la position
// après un mouvement dans une certaine direction
function applyDirectionX(x, direction)
{
	if(direction == GAUCHE)
		return x-1;
	if(direction == DROITE)
		return x+1;
	return x;
}
// Permet d'obtenir la composante y de la position
// après un mouvement dans une certaine direction
function applyDirectionY(y, direction)
{
	if(direction == HAUT)
		return y-1;
	if(direction == BAS)
		return y+1;
	return y;
}
// Permet de récupérer la position de mario
function findMario()
{
	for(var i=0; i<w*h; ++i)
	{
		if((mapCourante[i] & MARIO) != 0)
		{
			marioX = i%w;
			marioY = Math.floor(i/w);
			break;
		}
	}
}
// Pour savoir si le personnage peut se déplacer dans une certaine direction
function canMove(x, y, direction, map)
{
	var newx = applyDirectionX(x, direction);
	var newy = applyDirectionY(y, direction);
	if(newx < 0 || newy < 0 || newx >= w || newy >= h)
		return false;
	if((map[newy*w+newx] & MUR) != 0)
		return false;
	if((map[newy*w+newx] & CAISSE) != 0)
	{
		var newx2 = applyDirectionX(newx, direction);
		var newy2 = applyDirectionY(newy, direction);
		if(newx2 < 0 || newy2 < 0 || newx2 >= w || newy2 >= h)
			return false;
		if((map[newy2*w+newx2] & MUR) != 0 || (map[newy2*w+newx2] & CAISSE) != 0)
			return false;
	}
	return true;
}
// Déplacement du personnage
// Retourne la map après le mouvement
function move(x, y, direction, map)
{

	// -> Déterminer la nouvelle position
	// -> S'il y a une caisse dans la nouvelle case, on la déplace (même algo que le déplacement de mario mais sans la vérification de caisse)
	if((map[y*w+x] & CAISSE) != 0)
	{
		map[y*w+x] &= ~CAISSE;
		var newx = applyDirectionX(x, direction);
		var newy = applyDirectionY(y, direction);
		map[newy*w+newx] |= CAISSE;
	}
	map[y*w+x] |= MARIO;
	map[marioY*w+marioX] &= ~MARIO;
	marioX = x;
	marioY = y;
}
// Pour savoir si un niveau est dans la position
// qui permet de passer au suivant
function end(map)
{
	for(var i=0; i<w*h; ++i)
	{
		if((map[i] & CAISSE) != 0 && (map[i] & OBJECTIF) == 0)
			return false;
	}
	return true;
}
// Permet d'enregistrer le niveau dans les variable (pas dans le fichier)
function saveLevel()
{
	var nmario = 0, ncaisse = 0, nobjectif = 0;
	for(var i=0; i<w*h; ++i)
	{
		if((mapCourante[i] & MARIO) != 0)
			++nmario;
		if((mapCourante[i] & CAISSE) != 0)
			++ncaisse;
		if((mapCourante[i] & OBJECTIF) != 0)
			++nobjectif;
    }
	if(nmario == 1 && ncaisse == nobjectif && !end(mapCourante))
	{
		maps[imap].w = w;
		maps[imap].h = h;
		maps[imap].time = timeLeft;
		maps[imap].data[i] = new Array();
		for(var i=0; i<w*h; ++i)
			maps[imap].data[i] = mapCourante[i];
		return true;
    }
	else
		return false;
}
// Sauvegarde les niveaux dans le fichier
function saveFile()
{
	writeFile("maps.txt", JSON.stringify(maps));
}
// Permet de définir le niveau courant et de l'initialiser (pour le jeu et l'éditeur)
function setLevel(level)
{
	imap = level;
	if(imap < Taille(maps))
	{
		w = maps[imap].w;
		h = maps[imap].h;
		mapCourante = new Array();
		for(var i=0; i<w*h; ++i)
			mapCourante[i] = maps[imap].data[i];
		timeLeft = maps[imap].time;

		findMario();
		marioDirection = DROITE;
		lockLevel = false; // On dévérrouille les contrôles
		draw();
	}
	else
	{
		imap = Taille(maps)-1;
		clearTimeout(timeoutId);
		alert("Game Over\nBravo vous avez atteint la fin du jeu !");
		mode = parentMode;
		parentMode = MODE_MENU;
		setLevel(imap);
		draw();
	}
}
// Chaque seconde le temps diminu...
function timer()
{
	timeLeft--;
	if(timeLeft <= 0)
    {
		draw();
		alert("Game Over\nLe temps est écoulé, vous avez perdu !");
		mode = parentMode;
		parentMode = MODE_MENU;
		setLevel(imap);
		draw();
    }
	else
	{
		timeoutId = setTimeout(timer, 1000);
		draw();
    }
}
// Partie graphique
// Affichage d'une map
function DrawMap(xpad, ypad, map)
{
	for (var i=0; i<w*h; i++)
	{
		if ((map[i] & CAISSE) == 0 && (map[i] & OBJECTIF) != 0)
		{
			DrawImageObject(objectif, xpad+(i % w)*GRIDW, ypad+(Math.floor( i / w))*GRIDH, GRIDW, GRIDH);
		}
		if ((map[i] & MARIO) != 0)
		{
			var indice;
			if(marioDirection == DROITE)
				indice = 0;
			else if(marioDirection == GAUCHE)
				indice = 2;
			else if(marioDirection == HAUT)
				indice = 3;
			else if(marioDirection == BAS)
				indice = 1;
			DrawImageObject(mario[indice], xpad+(i % w)*GRIDW, ypad+(Math.floor( i / w))*GRIDH, GRIDW, GRIDH);
		}
		if ((map[i] & CAISSE) != 0 && (map[i] & OBJECTIF) == 0)
		{
			DrawImageObject(caisse, xpad+(i % w)*GRIDW, ypad+(Math.floor( i / w))*GRIDH, GRIDW, GRIDH);
		}
		if ((map[i] & CAISSE) != 0 && (map[i] & OBJECTIF) != 0)
		{
			DrawImageObject(caisse_ok, xpad+(i % w)*GRIDW, ypad+(Math.floor( i / w))*GRIDH, GRIDW, GRIDH);
		}
		if ((map[i] & MUR) != 0)
		{
			DrawImageObject(mur, xpad+(i % w)*GRIDW, ypad+(Math.floor( i / w))*GRIDH, GRIDW, GRIDH);
		}
	}
}
// Affiche une gille à la position (padx, pady) avec une taille de (w, h) et un espacement de (GRIDW, GRIDH)
function DrawGrid(padx, pady, w, h)
{
	for(var i=0; i<=w; ++i)
		Ligne(padx+i*GRIDW, pady, padx+i*GRIDW, pady+h*GRIDH, "#333");
	for(var i=0; i<=h; ++i)
		Ligne(padx, pady+i*GRIDH, padx+w*GRIDW, pady+i*GRIDH, "#333");
}
// Affichage en mode jeu
function DrawGame()
{
	DrawMap(PADDINGX, PADDINGY, mapCourante);
	Text(PADDINGX, 0, w*GRIDW, PADDINGY, "Temps restant: "+timeLeft+" secondes", "sans", 12, "#222", "", "center", "middle");
}
// Affichage en mode éditeur
function DrawEditor()
{
	// Affichage du niveau
	DrawMap(PADDINGX, PADDINGY, mapCourante);
	// Affichage de la selection
	if(mouseSelectX != -1)
	{
		RectanglePlein(PADDINGX+mouseSelectX*GRIDW, PADDINGY+mouseSelectY*GRIDH, GRIDW, GRIDH, "#fff");
		if(editorTool == TOOL_DEL)
		{
			Ligne(PADDINGX+mouseSelectX*GRIDW, PADDINGY+mouseSelectY*GRIDH, PADDINGX+(mouseSelectX+1)*GRIDW, PADDINGY+(mouseSelectY+1)*GRIDH, "red");
			Ligne(PADDINGX+(mouseSelectX+1)*GRIDW, PADDINGY+mouseSelectY*GRIDH, PADDINGX+mouseSelectX*GRIDW, PADDINGY+(mouseSelectY+1)*GRIDH, "red");
        }
		else if(editorTool == TOOL_MUR)
        {
			DrawImageObject(mur, PADDINGX+mouseSelectX*GRIDW, PADDINGY+mouseSelectY*GRIDH, GRIDW, GRIDH);
        }
		else if(editorTool == TOOL_CAISSE)
        {
			DrawImageObject(caisse, PADDINGX+mouseSelectX*GRIDW, PADDINGY+mouseSelectY*GRIDH, GRIDW, GRIDH);
        }
		else if(editorTool == TOOL_OBJECTIF)
        {
			DrawImageObject(objectif, PADDINGX+mouseSelectX*GRIDW, PADDINGY+mouseSelectY*GRIDH, GRIDW, GRIDH);
        }
		else if(editorTool == TOOL_MARIO)
        {
			DrawImageObject(mario[0], PADDINGX+mouseSelectX*GRIDW, PADDINGY+mouseSelectY*GRIDH, GRIDW, GRIDH);
        }
		else if(editorTool == TOOL_CAISSEOK)
        {
			DrawImageObject(caisse_ok, PADDINGX+mouseSelectX*GRIDW, PADDINGY+mouseSelectY*GRIDH, GRIDW, GRIDH);
        }
		RectanglePlein(PADDINGX+mouseSelectX*GRIDW+1, PADDINGY+mouseSelectY*GRIDH+1, GRIDW-2, GRIDH-2, rgba(255, 255, 255, 0.5));
	}
	// Affichage de la grille
	DrawGrid(PADDINGX, PADDINGY, w, h);

	// Affichage des outil
	Ligne(TOOL_PADDINGX, TOOL_PADDINGY, GRIDW+TOOL_PADDINGX, GRIDH+TOOL_PADDINGY, "red");
	Ligne(GRIDW+TOOL_PADDINGX, TOOL_PADDINGY, TOOL_PADDINGX, GRIDH+TOOL_PADDINGY, "red");

	DrawImageObject(mur, TOOL_PADDINGX+TOOL_MUR*GRIDW, TOOL_PADDINGY, GRIDW, GRIDH);
	DrawImageObject(caisse, TOOL_PADDINGX+TOOL_CAISSE*GRIDW, TOOL_PADDINGY, GRIDW, GRIDH);
	DrawImageObject(objectif, TOOL_PADDINGX+TOOL_OBJECTIF*GRIDW, TOOL_PADDINGY, GRIDW, GRIDH);
	DrawImageObject(mario[0], TOOL_PADDINGX+TOOL_MARIO*GRIDW, TOOL_PADDINGY, GRIDW, GRIDH);
	DrawImageObject(caisse_ok, TOOL_PADDINGX+TOOL_CAISSEOK*GRIDW, TOOL_PADDINGY, GRIDW, GRIDH);

	// Outil selectionné
	RectanglePlein(TOOL_PADDINGX+editorTool*GRIDW, TOOL_PADDINGY, GRIDW, GRIDH, rgba(0, 0, 255, 0.5));

	// Affichage réglages
	Rectangle(TOOL_PADDINGX+6*GRIDW, TOOL_PADDINGY, GRIDW, GRIDH, "black");
	PolygonePlein(TOOL_PADDINGX+6*GRIDW+4, TOOL_PADDINGY+4, TOOL_PADDINGX+6*GRIDW+4, TOOL_PADDINGY+GRIDW-4, TOOL_PADDINGX+7*GRIDW-4, TOOL_PADDINGY+GRIDH/2, "green");
	Rectangle(TOOL_PADDINGX+7*GRIDW, TOOL_PADDINGY, GRIDW*2, GRIDH, "black");
	Rectangle(TOOL_PADDINGX+9*GRIDW, TOOL_PADDINGY, GRIDW*2, GRIDH, "black");
	Rectangle(TOOL_PADDINGX+11*GRIDW, TOOL_PADDINGY, GRIDW, GRIDH, "black");
	Text(TOOL_PADDINGX+7*GRIDW, TOOL_PADDINGY, GRIDW*2, GRIDH, w+"x"+h, "sans", 12, "#222", "", "center", "middle");
	Text(TOOL_PADDINGX+9*GRIDW, TOOL_PADDINGY, GRIDW*2, GRIDH, timeLeft+"s", "sans", 12, "#222", "", "center", "middle");
	Text(TOOL_PADDINGX+11*GRIDW, TOOL_PADDINGY, GRIDW, GRIDH, "S", "sans", 14, "#222", "", "center", "middle");
}
// Affichage en mode menu
function DrawMenu()
{
	Text(16, 64, 640, 64, "Mario Sokoban", "sans", 16, "#222", "bold", "center", "top");
	Text(16, 64+64, 640, 32, "Pour commencer le jeu appuyez sur S", "sans", 14, "#222", "", "center", "top");
	Text(16, 64+96, 640, 32, "Pour accéder à l'éditeur de niveau appuyez sur E", "sans", 14, "#222", "", "center", "top");
}
// Affichage
function draw()
{
	Initialiser();
	if(mode == MODE_GAME)
		DrawGame();
	else if(mode == MODE_EDITOR)
		DrawEditor();
	else if(mode == MODE_MENU)
		DrawMenu();
}
// Quand on appui sur une touche du clavier...
function Keypressed(c)
{
	if(lockLevel) // Les contrôles sont bloqué
		return; // Arrêt de la procédure/fonction
	if(mode == MODE_MENU)
    {
		if(c == Caractere_vers_Ascii('S')) // On démarre le niveau
		{
			mode = MODE_GAME;
			parentMode = MODE_MENU;

			setLevel(0); // On se place au premier niveau
			timeoutId = setTimeout(timer, 1000); // On démarre le timer
		}
		else if(c == Caractere_vers_Ascii('E')) // On démarre l'éditeur de niveau
		{
			var lvl = SaisieEntier("Numéro du niveau (0-"+(Taille(maps)-1)+") ou -1 pour créer un nouveau : ");
			if(lvl == -1)
			{
				lvl = Taille(maps);
				maps[Taille(maps)] = DefaultLevel;
			}
			if(lvl >= Taille(maps) || lvl < 0)
            {
				alert("Le niveau "+lvl+" n'existe pas");
            }
			else
			{
				mode = MODE_EDITOR;
				parentMode = MODE_MENU;
				editorTool = TOOL_DEL;

				setLevel(lvl); // On se place au niveau correspondant
            }
		}
		else if(c == Caractere_vers_Ascii('K')) // On démarre l'éditeur de niveau
		{
			var lvl = SaisieEntier("Menu de triche\nNuméro du niveau (0-"+(Taille(maps)-1)+") : ");
			if(lvl >= Taille(maps) || lvl < 0)
            {
				alert("Le niveau "+lvl+" n'existe pas");
            }
			else
			{
				mode = MODE_GAME;
				parentMode = MODE_MENU;

				setLevel(lvl); // On se place au niveau correspondant
				timeoutId = setTimeout(timer, 1000); // On démarre le timer
            }
		}
    }
	else if(mode == MODE_GAME)
	{
		if(c == GAUCHE || c == DROITE || c == HAUT || c == BAS)
		{
			marioDirection = c;
			if(canMove(marioX, marioY, c, mapCourante))
			{
				var newx = applyDirectionX(marioX, c);
				var newy = applyDirectionY(marioY, c);
				move(newx, newy, c, mapCourante);
				if(end(mapCourante))
				{
					lockLevel = true;
					if(parentMode != MODE_EDITOR)
                    {
						setTimeout(function() { setLevel(imap+1); }, 300);
                    }
					else
                    {
						clearTimeout(timeoutId);
						setTimeout(function()
									{
										mode = parentMode;
                          				parentMode = MODE_MENU;
										setLevel(imap); // On réinitialise le niveau
                        			}, 300);
					}
				}
			}
		}
		else if(c == 27) // Esc
		{
			clearTimeout(timeoutId);
			mode = parentMode;
			parentMode = MODE_MENU;
			setLevel(imap); // On réinitialise le niveau
		}
    }
	else if(mode == MODE_EDITOR)
    {
		if(c == 27) // Esc
		{
			mode = parentMode;
			parentMode = MODE_MENU;
			setLevel(imap); // On réinitialise le niveau
		}
	}
	draw();
}
// Lorsqu'on clique à la souris
function MouseClick(x, y)
{
	if(mode == MODE_EDITOR)
    {
		if(mouseSelectX != -1)
        {
			if(editorTool == TOOL_DEL)
			{
				mapCourante[mouseSelectY*w+mouseSelectX] = VIDE;
        	}
			else if(editorTool == TOOL_MUR)
        	{
				mapCourante[mouseSelectY*w+mouseSelectX] = MUR;
        	}
			else if(editorTool == TOOL_CAISSE)
        	{
				mapCourante[mouseSelectY*w+mouseSelectX] = CAISSE;
        	}
			else if(editorTool == TOOL_OBJECTIF)
        	{
				mapCourante[mouseSelectY*w+mouseSelectX] = OBJECTIF;
        	}
			else if(editorTool == TOOL_MARIO)
        	{
				mapCourante[mouseSelectY*w+mouseSelectX] = MARIO;
        	}
			else if(editorTool == TOOL_CAISSEOK)
        	{
				mapCourante[mouseSelectY*w+mouseSelectX] = CAISSE_OK;
        	}
        }
		else
        {
			if(x >= TOOL_PADDINGX && y >= TOOL_PADDINGY && x < TOOL_PADDINGX+6*GRIDW && y < TOOL_PADDINGY+1*GRIDH) // Selection d'outil
            {
				editorTool = Math.floor((mouseX-TOOL_PADDINGX)/GRIDW);
			}
			else if(x >= TOOL_PADDINGX && y >= TOOL_PADDINGY && x >= TOOL_PADDINGX+6*GRIDW && x < TOOL_PADDINGX+7*GRIDW) // Test du niveau
			{
				if(saveLevel())
				{
					mode = MODE_GAME;
					parentMode = MODE_EDITOR;
					setLevel(imap);
					timeoutId = setTimeout(timer, 1000);
                }
				else
					alert("Le niveau n'est pas valide, pour qu'il le soit il faut :\n- Un et un seul mario\n- Le même nombre de caisses que d'objectifs\n- Au moins une caisse qui n'est pas sur son objectif");
            }
			else if(x >= TOOL_PADDINGX && y >= TOOL_PADDINGY && x >= TOOL_PADDINGX+7*GRIDW && x < TOOL_PADDINGX+9*GRIDW) // Réglage taille
            {
				var neww = SaisieEntier("Nouvelle largeur (3-40) : ");
				var newh = SaisieEntier("Nouvelle hauteur (3-25) : ");
				if(neww >= 3 && neww <= 40 && newh >= 3 && newh <= 25)
                {
					newMap = new Array();
					for(var i=0; i<neww*newh; ++i)
					{
						if(i%neww < w && Math.floor(i/neww) < h)
							newMap[i] = mapCourante[Math.floor(i/neww)*w+(i%neww)];
						else
							newMap[i] = 0;
					}
					w = neww;
					h = newh;
					mapCourante = new Array();
					mapCourante = newMap;
                }
				else
                {
					alert("Dimentions invalide");
                }
            }
			else if(x >= TOOL_PADDINGX && y >= TOOL_PADDINGY && x >= TOOL_PADDINGX+9*GRIDW && x < TOOL_PADDINGX+11*GRIDW) // Réglage Temps
            {
				var newtime = SaisieEntier("Nouveau temps (en seconde) 10-1800 : ");
				if(newtime >= 10 && newtime <= 1800)
                {
					timeLeft = newtime;
                }
				else
                {
					alert("Temps invalide");
                }
            }
			else if(x >= TOOL_PADDINGX && y >= TOOL_PADDINGY && x >= TOOL_PADDINGX+11*GRIDW && x < TOOL_PADDINGX+12*GRIDW) // Sauvegarde
            {
				if(saveLevel())
				{
					saveFile();
					alert("Sauvegarde effectué avec succès");
                }
				else
					alert("Le niveau n'est pas valide, pour qu'il le soit, il faut :\n- Un et un seul mario\n- Le même nombre de caisse que d'objectif\n- Au moins une caisse qui n'est pas sur son objectif");
            }
        }
		draw();
    }
}
// Déplacement de la souris dans le canvas
function mousemove(e)
{
	if(mode == MODE_EDITOR)
    {
		var lastX = mouseSelectX;
		var lastY = mouseSelectY;
		if(mouseX >= PADDINGX && mouseY >= PADDINGY && mouseX < PADDINGX+w*GRIDW && mouseY < PADDINGY+h*GRIDH)
        {
			mouseSelectX = Math.floor((mouseX-PADDINGX)/GRIDW);
			mouseSelectY = Math.floor((mouseY-PADDINGY)/GRIDH);
        }
		else
        {
			mouseSelectX = -1;
			mouseSelectY = -1;
        }
		if(lastX != mouseSelectX || lastY != mouseSelectY)
		{
			draw();
        }
    }
}
// Chargement du jeu (images + niveaux)
function init()
{
	turtleEnabled = false;
	mario = new Array();
	mario[0] = PreloadImage("https://user.oc-static.com/files/1_1000/46.gif");
	mario[1] = PreloadImage("https://user.oc-static.com/files/1_1000/45.gif");
	mario[2] = PreloadImage("https://user.oc-static.com/files/1_1000/47.gif");
	mario[3] = PreloadImage("https://user.oc-static.com/files/1_1000/48.gif");
	caisse = PreloadImage("https://user.oc-static.com/files/10001_11000/10114.jpg");
	caisse_ok = PreloadImage("https://user.oc-static.com/files/10001_11000/10117.jpg");
	objectif = PreloadImage("https://user.oc-static.com/files/10001_11000/10118.png");
	mur = PreloadImage("https://user.oc-static.com/files/10001_11000/10113.jpg");

	// Permet de charger les niveaux depuis un fichier sous forme d'un tableau de type "niveau"
	maps = JSON.parse(readFile("maps.txt"));

	WaitPreload(start); // on attend la fin du chargement
}
// Lorsque le chargement du jeu est terminé, on le démarre
function start()
{
	mode = MODE_MENU;
	parentMode = MODE_MENU;

	document.getElementById('mycanvas').onmousemove = mousemove;

	draw();
}
init();

