import { Game } from './Game';
import { PlayerModel } from './Player';
import { Card } from '../types';

/**
 * ゲームマネージャークラス
 * 複数のゲームを管理する
 */
export class GameManager {
  private games: Map<string, Game>;
  private playerGameMap: Map<string, string>; // プレイヤーID -> ゲームID

  constructor() {
    this.games = new Map();
    this.playerGameMap = new Map();
  }

  /**
   * 新しいゲームを作成する
   */
  createGame(): Game {
    const game = new Game();
    this.games.set(game.id, game);
    return game;
  }

  /**
   * ゲームを取得する
   */
  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  /**
   * プレイヤーのゲームを取得する
   */
  getPlayerGame(playerId: string): Game | undefined {
    const gameId = this.playerGameMap.get(playerId);
    if (gameId) {
      return this.getGame(gameId);
    }
    return undefined;
  }

  /**
   * ゲームにプレイヤーを追加する
   */
  addPlayerToGame(gameId: string, playerId: string, username: string, deck: Card[]): boolean {
    const game = this.getGame(gameId);
    if (!game) {
      return false;
    }

    const player = new PlayerModel(playerId, username, deck);
    const success = game.addPlayer(player);
    
    if (success) {
      this.playerGameMap.set(playerId, gameId);
    }
    
    return success;
  }

  /**
   * ゲームを開始する
   */
  startGame(gameId: string): boolean {
    const game = this.getGame(gameId);
    if (!game) {
      return false;
    }
    
    return game.start();
  }

  /**
   * ゲームを終了して削除する
   */
  endGame(gameId: string): boolean {
    const game = this.getGame(gameId);
    if (!game) {
      return false;
    }
    
    // プレイヤーとゲームの関連付けを削除
    game.players.forEach(player => {
      this.playerGameMap.delete(player.id);
    });
    
    // ゲームを削除
    return this.games.delete(gameId);
  }

  /**
   * 全てのゲームを取得
   */
  getAllGames(): Game[] {
    return Array.from(this.games.values());
  }

  /**
   * 参加可能なゲームを取得
   */
  getJoinableGames(): Game[] {
    return this.getAllGames().filter(game => 
      !game.started && game.players.length < 2);
  }

  /**
   * プレイヤーが参加しているゲームを取得
   */
  getPlayerGames(playerId: string): Game[] {
    return this.getAllGames().filter(game => 
      game.players.some(player => player.id === playerId));
  }

}