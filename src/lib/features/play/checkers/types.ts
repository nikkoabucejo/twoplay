export type PieceColor = "cyan" | "pink";
export type Piece = { color: PieceColor; king: boolean };
export type Square = Piece | null;
export type Board = Square[];

export type Move = {
	from: number;
	to: number;
	captured: number | null;
};
